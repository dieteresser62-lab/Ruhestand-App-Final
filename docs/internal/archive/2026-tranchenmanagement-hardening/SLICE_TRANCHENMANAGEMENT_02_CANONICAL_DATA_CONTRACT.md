# Slice Tranchenmanagement 02: Kanonischer Datencontract

**Feature-Branch:** `codex/tranchenmanagement-hardening`
**GitHub-Status:** lokal; Veröffentlichung ausstehend
**Status:** freigegeben
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

Ursprünglich maximal zehn inklusive des verpflichtend neu erzeugten Engine-Bundles:

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

Der notwendige elfte Programmdiff wurde nach Eintritt der Stop-Regel am 2026-07-14
vom Nutzer ausdrücklich freigegeben. Tatsächlich geändert wurden:

- neu: `types/tranche-contract.js`
- `types/profile-types.js`
- `app/tranches/tranchen-manager-state.js`
- `app/tranches/tranchen-manager-modal.js`
- `engine/transactions/sale-engine.mjs`
- neu: `tests/tranche-contract.test.mjs`
- `tests/tranchen-manager-state.test.mjs`
- `tests/tranchen-manager-modal.test.mjs`
- `tests/transaction-tax.test.mjs`
- `tests/3bucket-refill.test.mjs`
- `tests/tranchen-manager-page.test.mjs`

`engine.js` wurde ausschließlich über `npm run build:engine` neu erzeugt. Da lokal
kein `esbuild` verfügbar war und bereits der Modul-Fallback versioniert ist, blieb
die Datei bytegleich und erscheint nicht im Diff.

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

Die unversionierten Playwright-Dateien waren bereits vor Slice-Beginn vorhanden, liegen
unter dem ausdrücklich ausgeschlossenen Verzeichnis `node_modules/` und werden nicht
verändert.

Geplante Dateien:

- die ursprünglich zehn geplanten Programmdateien einschließlich des generierten Bundles sowie diese Slice-MD und Hauptplan;
- nach dokumentierter Nutzerfreigabe maximal elf tatsächliche Programmdiffs für die notwendigen kanonischen 3-Bucket- und Manager-Page-Fixtures.

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

- Der neue DOM-freie Contract verwendet pro Lot `schemaVersion: 1`; unversionierte
  Records sind der einzige unterstützte Legacy-Stand v0. Unbekannte Versionen
  werden mit `TRANCHE_SCHEMA_VERSION_UNSUPPORTED` blockiert.
- Die zulässige Matrix ist disjunkt: `equity` mit `aktien_alt|aktien_neu`,
  `bonds` mit `anleihe`, `money_market` mit `geldmarkt` und `gold` mit `gold`.
- IDs, Finanzwerte, TQF, Datum, ISIN und Ticker werden mutationsfrei normalisiert
  beziehungsweise mit Feld-, Index- und Lotkontext validiert.
- Der synthetische 100-EUR-Mismatch erzeugt keine doppelte Sell-Order mehr,
  sondern vor Berechnungsbeginn einen kontrollierbaren Engine-`ValidationError`.
- Doppelte IDs und nicht-arrayförmige `detailledTranches` fallen ebenfalls
  fail-closed aus; gültige Steuer-, Settlement-, Backtest- und Worker-Golden-Cases
  bleiben unverändert grün.
- `detailledTranches` blieb der einzige Feldname. Settlement-, LossCarry-, VPW-,
  3-Bucket- und `minimumFlexAnnual`-Semantik wurden nicht geändert.

## Durchgeführte Änderungen

- `types/tranche-contract.js`: Schema v1, Feldgruppen, Kategorie-/Typ-Matrix,
  deterministische v0-Migration, Instrumentidentität, strukturierte Fehler und
  getrennte Persistenz-/Engine-Normalisierung.
- `types/profile-types.js`: kanonische Persistenzfelder, abgeleitete Felder und
  Merge-Provenienz als getrennte JSDoc-Typen dokumentiert.
- Manager-State und Form-Reader: gemeinsamer Contract für Laden, Speichern,
  Ableitungen und striktes Form-Parsing; leere TQF bleibt fehlend statt `0`.
- Sale-Engine: zusätzliche Validierung an der Enginegrenze, disjunkte Sell-Order,
  eindeutige Lot-IDs und Weitergabe strukturierter Contractfehler als Enginefehler.
- Legacy-Engine-v0: `null`-IDs und historische Null-Platzhalter für nicht vorhandene
  Stück-/Preisdaten werden nur bei vorhandenen Aggregatwerten deterministisch
  migriert; persistierte und v1-Daten bleiben strikt.
- Tests: neue Contractmatrix sowie Negativfälle für Versionen, NaN/Infinity,
  Wertebereiche, Datum, leere TQF, Duplikate, Mismatch, Provenienz und ungültige
  Collection-Shapes; bestehende Fixtures auf den bestätigten Contract gebracht.

## Ausgeführte Tests

| Befehl | Ergebnis |
| --- | --- |
| `node tests/run-single.mjs tests/tranche-contract.test.mjs` | grün; 73/73 Assertions |
| `node tests/run-single.mjs tests/tranchen-manager-state.test.mjs` | grün; 15/15 Assertions |
| `node tests/run-single.mjs tests/tranchen-manager-modal.test.mjs` | grün; 15/15 Assertions |
| `node tests/run-single.mjs tests/tranchen-manager-page.test.mjs` | grün; 10/10 Assertions; erwarteter Offline-Pfad sichtbar |
| `node tests/run-single.mjs tests/transaction-tax.test.mjs` | grün; 34/34 Assertions |
| `node tests/run-single.mjs tests/depot-tranches.test.mjs` | grün; 22/22 Assertions |
| `node tests/run-single.mjs tests/3bucket-refill.test.mjs` | grün; 25/25 Assertions |
| `node tests/run-single.mjs tests/worker-parity.test.mjs` | grün; 354/354 Assertions |
| `node tests/run-single.mjs tests/simulator-backtest.test.mjs` | grün; 39/39 Assertions; FlowDelta-Gates unverändert |
| `npm run build:engine` | grün; vorgesehener Modul-Fallback, `engine.js` bytegleich |
| `npm test` | grün; 104 Dateien, 4034/4034 Assertions, 0 Dateifehler, 0 offene Handles |
| `npm run test:browser` | grün; elf Browser-Smoke-Szenarien einschließlich Tranchenmanager |

Die vollständige Suite umfasst die vorhandenen Snapshot-, Settlement-, Core-,
Simulator- und Worker-Gates. Es gab keine unerwartete Snapshot-, Backtest- oder
FlowDelta-Abweichung.

## Abweichungen vom Plan

- `tests/3bucket-refill.test.mjs` musste mehrdeutige historische Testtypen wie
  `ETF`/`custom-world-fund` und einen Kategorie-/Typ-Mismatch durch kanonische
  Paare ersetzen; andernfalls hätte der bestätigte strikte Contract bewusst rot
  bleiben müssen.
- `tests/tranchen-manager-page.test.mjs` benötigte im als gültig bezeichneten
  Storage-Fixture die nun verpflichtende TQF. Der Nutzer hat die Erweiterung auf
  elf Programmdateien nach der Stop-Regel ausdrücklich freigegeben.
- `engine.js` wurde korrekt über das Buildskript erzeugt, blieb wegen des bereits
  versionierten Modul-Fallbacks aber ohne Diff. Ein echter `esbuild`-Bundlelauf war
  in der lokalen Installation nicht möglich.
- Das Browser-Smoke-Gate wurde zusätzlich zum ursprünglichen Testplan ausgeführt,
  weil Manager-State und Form-Reader browsernah sind.

## Offene Risiken

- Legacy-Daten mit fehlender TQF, mehrdeutigen Typen oder widersprüchlichen Paaren
  werden absichtlich blockiert. Die sichtbare UI-Aufbereitung folgt in Slice 04.
- Korrupte JSON-Payloads werden im bestehenden Managerpfad weiterhin als leer
  behandelt; Rohdatenerhalt und Recovery sind ausdrücklich Gegenstand von Slice 03.
- Der gemeinsame Import ist im Modul-Fallback und in allen Node-/Browser-Gates
  belegt. Ein lokaler echter `esbuild`-Bundlelauf steht mangels installiertem
  `esbuild` noch aus.
- Simulatoradapter erzeugen bis Slice 07 weiterhin Legacy-v0-Aggregat-Lots mit
  Null-Platzhaltern und eigener TQF-Vorbelegung. Der Contract migriert nur die
  technisch eindeutigen Null-Platzhalter; die Consumer-Parität bleibt Folgescope.
- `instrumentId` ist kanonisch ableitbar, wird in diesem Slice aber noch nicht für
  eine neue FIFO-Semantik verwendet; eine solche Semantikänderung war Nicht-Scope.

## Rückdokumentation

- Contract-Matrix, Legacy-Regeln, tatsächliche Programmdateien und Testergebnisse
  sind im Hauptplan und in der GAP-Analyse zurückgetragen.
- Die öffentliche Referenzdokumentation (`TECHNICAL.md`, Modulreferenzen und
  `engine/README.md`) bleibt wie geplant dem Abschluss-Slice 09 vorbehalten.

## Freigabestatus

Freigegeben (Gemini-Review abgeschlossen, Claude-Review ausstehend).

## Review-Feedback von Gemini

### 1. Prüfdimensionen

* **Korrektheit vs. Akzeptanzkriterien:** Alle Akzeptanzkriterien wurden vollständig erfüllt. Der Doppelverkauf bei Mismatch-Tranchen wurde durch das disjunkte Filtern nach den neuen Kategorie-Typ-Paaren und die Deduplizierung über `uniqueExisting` an der Enginegrenze behoben.
* **Vertragstreue:** Die Typ-Kategorie-Matrix wird strikt eingehalten. Das Schnittstellensystem zwischen UI, Persistenz, Simulator und Engine ist vertragskonform.
* **Fehlerbehandlung:** Robuste Handhabung von unendlichen und nicht-endlichen Werten (`Number.isFinite`), TQF-Grenzbereichen (0 bis 1) und ungültigen Kalendertagen im Kaufdatum. Validierungsfehler der Engine werden sauber als `ValidationError` mit Fehlercode `TRANCHE_VALIDATION_FAILED` geworfen, was die fail-closed Invariante absichert.
* **Seiteneffekte:** Die Legacy-Migrationen (z. B. null-Preise) greifen nur bei unversionierten v0-Daten, wodurch neuere v1-Daten strikt validiert bleiben und keine unkontrollierten Datenänderungen auftreten.
* **Was könnte brechen:** Die Modul-Fallback-Bündelung von `engine.js` funktioniert fehlerfrei, aber falls `esbuild` künftig wieder aktiv wird, müssen wir sicherstellen, dass Pfadauflösungen für `types/` reibungslos laufen. Dies ist jedoch durch esbuilds native ESM-Resolver voll abgedeckt.

### 2. Findings

* **G2-01 (Mangelndes UI-Feedback bei ValidationError):** Wenn der Engine-Berechnungspfad mit einem `ValidationError` (z. B. durch ein ungültiges Kategorie/Typ-Paar oder Duplikate aus Altdaten) fehlschlägt, blockiert dies die Berechnung. Die genaue UI-Rückmeldung und die Recovery dazu folgen erst in den Slices 03 und 04.
  * *Entscheidung:* Akzeptiertes Restrisiko, da in Slice 02 vereinbarungsgemäß nur die Engine-Grenze fail-closed gehärtet wurde und die UI in Folgeslices angepasst wird.

### 3. Pre-Mortem

Angenommen, diese Implementierung verursacht in 3 Monaten einen Fehler im Produktivbetrieb – was ist die wahrscheinlichste Ursache?
> Ein Nutzer importiert ein sehr altes Backup-Profil mit Tranchen, die ungültige/widersprüchliche Kategorie-Typ-Kombinationen oder negative Cost-Basis-Werte enthalten. Da die UI-Härtung (Slice 03/04) noch nicht alle Altdaten-Sonderfälle abfangen kann, wirft die Engine mitten in der Jahresberechnung den `ValidationError` (fail-closed). Der Nutzer sieht eine blockierende Fehlermeldung im UI und kann das Jahr nicht simulieren, bis die Altdaten im Tranchenmanager bereinigt wurden. Dies ist zwar fachlich korrekt (fail-closed zum Schutz der Steuerberechnung), erfordert aber eine verständliche UI-Führung in Slice 04, um den Nutzer nicht ratlos zu hinterlassen.

### 4. Review-Ergebnis

* **Status:** freigegeben
* **Blocker:** keine
* **Restrisiken:**
  * Notwendigkeit der Altdatenbereinigung bei ungültigen Bestandsprofilen.
  * Abhängigkeit von der vollständigen Umsetzung der Folgeslices 03 und 04 für eine benutzerfreundliche Recovery-UX bei Validierungsfehlern.

## Review-Feedback von Claude

Ausstehend: insbesondere öffentliche API, Bundlergrenze und Seiteneffekte.

## Review-Antworten von Codex

Ausstehend.

## Review-Entscheidungen

| ID | Quelle | Finding | Entscheidung | Umsetzung |
| --- | --- | --- | --- | --- |
| - | - | Noch kein Review | offen | - |
