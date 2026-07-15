# Slice Tranchenmanagement 06: Balance-, Status- und Steuerparität

**Feature-Branch:** `codex/tranchenmanagement-hardening`
**GitHub-Status:** lokal; Veröffentlichung ausstehend
**Status:** freigegeben
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
git branch --show-current: codex/tranchenmanagement-hardening
git status --short --branch:
## codex/tranchenmanagement-hardening
?? node_modules/.bin/playwright
?? node_modules/.bin/playwright-core
?? node_modules/.bin/playwright-core.cmd
?? node_modules/.bin/playwright-core.ps1
?? node_modules/.bin/playwright.cmd
?? node_modules/.bin/playwright.ps1
?? node_modules/playwright-core/
?? node_modules/playwright/
```

Die unversionierten Playwright-Dateien waren vor Slice-Beginn vorhanden, liegen
außerhalb des Slice-Scopes und werden nicht verändert.

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
- `engine.js`, `dist/`, Release-Artefakte,
- die vorhandenen unversionierten Playwright-Dateien unter `node_modules/`.

Rollback-Strategie:

- die acht vorhandenen Programmdateien mit `git checkout -- <dateien>` auf den
  letzten Slice-Commit zurücksetzen; die neue Datei
  `tests/depot-tranchen-status.test.mjs` nur nach Freigabe entfernen.
- Einheiten- und Klassifikationsänderungen nicht partiell zurücknehmen.

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

- Die vier Zustände `not_loaded`, `empty`, `valid` und `error` sind im
  Produktionsstatus unterscheidbar; nur `valid` weist FIFO als aktiv aus.
- Profilverbund-Overrides haben auch als `[]` Vorrang. Explizit leere Profilbestände
  erzeugen weder synthetische Lots noch einen Fallback auf veraltete Balance-Werte.
- Balance-Reader, Statusaggregation und Profilverbund verwenden die disjunkte
  Kategorie-/Typ-Matrix aus `types/tranche-contract.js`. Widersprüche brechen mit
  stabilem Validierungs-/Storage-Code ab.
- Die Balance-Kirchensteuerwerte `0.08` und `0.09` bleiben entlang Leser,
  Profilverbund und bestehendem Enginevertrag Dezimalraten. Es gibt keine zweite
  Division durch 100.
- Die steuerorientierte Tranchenauswahl berücksichtigt die lotbezogene TQF. Die
  Action-Attribution leitet eine fehlende TQF nicht mehr still als 30 % ab.
- Geldmarkt und Gold werden nicht zusätzlich als Aktienbestand gezählt. Die
  Statussynchronisation ersetzt den Geldmarkt-Aggregatwert und addiert keine zweite
  Position. Negative Renditen erhalten genau ein Minuszeichen.
- `engine/`, öffentliche `EngineAPI`, `minimumFlexAnnual`, Snapshots, Backtest-
  Baselines und generierte Artefakte blieben unverändert.

## Durchgeführte Änderungen

- `app/tranches/depot-tranchen-status.js` nutzt den Loader aus Slice 03 und den
  Contract aus Slice 02, rendert die vier Statuszustände und aggregiert ausschließlich
  kanonisch klassifizierte Tranchen.
- `app/balance/balance-reader.js` liest den Produktionsstatus direkt, übernimmt ein
  leeres Haushalts-Override als `detailledTranches: []` und blockiert korrupte Daten
  mit einem feldbezogenen `ValidationError`.
- `app/profile/profilverbund-balance.js` erhält explizite Empty-Provenienz,
  unterdrückt synthetische Fallback-Lots, validiert gespeicherte Profiltranchen und
  korrigiert Kirchensteuer-/TQF-Berechnung.
- `app/profile/profilverbund-action-attribution.js` klassifiziert Assetquellen über
  den gemeinsamen Contract und verlangt eine bestätigte TQF zwischen 0 und 1.
- Der neue direkte Status-Test und die vier erweiterten Regressionstests prüfen
  Produktion statt Testkopie, Empty/Corrupt, Doppelzählung, Vorzeichen,
  Kirchensteuer und TQF.

## Ausgeführte Tests

| Gate | Ergebnis |
| --- | --- |
| `node tests/run-single.mjs tests/depot-tranchen-status.test.mjs` | grün; 25/25 Assertions |
| `node tests/run-single.mjs tests/profilverbund-balance.test.mjs` | grün; 105/105 Assertions |
| `node tests/run-single.mjs tests/balance-reader.test.mjs` | grün; 102/102 Assertions |
| `node tests/run-single.mjs tests/profile-ui-contract.test.mjs` | grün; 18/18 Assertions |
| `node tests/run-single.mjs tests/transaction-tax.test.mjs` | grün; 36/36 Assertions |
| `npm test` | grün; 105 Dateien, 4253/4253 Assertions, 0 Fehler, 0 offene Handles |
| `npm run test:browser` | grün; 11/11 Smoke-Szenarien |
| `git diff --check` | grün |

Der Gesamtlauf umfasst die vorhandenen Golden Cases, Snapshots, Worker-Parität,
historischen Backtest und FlowDelta; es gab keine unerwartete Abweichung.
`npm run build:engine` war nicht erforderlich, weil weder `engine/` noch die
öffentliche `EngineAPI` geändert wurden.

## Abweichungen vom Plan

- Keine Abweichung vom Neun-Dateien-Programmscope.
- Zusätzlich zum geplanten Gate wurde wegen des geänderten Status-Markups
  `npm run test:browser` ausgeführt.

## Offene Risiken

- Widersprüchliche oder unvollständige Altdaten werden jetzt fail-closed sichtbar;
  die nutzergeführte Migration solcher Bestände bleibt Bestandteil von Slice 09.
- Bonds bleiben für die bestehende Engine-/Balance-Kompatibilität zusätzlich im
  Legacy-Feld `depotwertNeu`, aber nicht in einer zweiten kanonischen Assetklasse.
- Die bestehende Lifecycle-/Polling-Aktualisierung wurde nicht zu einem neuen
  Cross-Window-Broadcastvertrag erweitert; die vollständige E2E-Kette folgt in
  Slice 09.

## Rückdokumentation

- Bestätigte Einheiten, Klassifikations-, Status- und Leersemantik sind in
  Hauptplan und GAP-Analyse eingetragen.
- Betroffene Architektur-, Balance- und Steuerreferenzen bleiben wie geplant für
  den querschnittlichen Dokumentationsabschluss in Slice 09 vorgemerkt.

## Freigabestatus

Freigegeben (Gemini-Review abgeschlossen, Claude-Review ausstehend).

## Review-Feedback von Gemini

### 1. Prüfdimensionen

* **Korrektheit vs. Akzeptanzkriterien:** Alle Akzeptanzkriterien wurden vollständig und fehlerfrei erfüllt. Die TQF-abhängige Steuerberechnung (`taxPerEuro = profitRatio * (1 - tqf) * taxRate`) im Haushaltsattributionstyp und die korrigierte Kirchensteuerberechnung wurden erfolgreich behoben. Die double-counting Absicherung für Gold und Geldmarkt funktioniert zuverlässig.
* **Vertragstreue:** `depot-tranchen-status.js` nutzt den Contract aus `tranche-contract.js` zur einheitlichen Klassifizierung.
* **Fehlerbehandlung:** Bei einem Speicherlesefehler (`corrupt` oder `unavailable`) wirft `depot-tranchen-status.js` beziehungsweise `balance-reader.js` einen kontrollierten `ValidationError` (fail-closed), statt mit unvollständigen Werten fortzufahren.
* **Seiteneffekte:** Ein explizit leerer Tranchenbestand im Override (`depot_tranchen: '[]'`) wird nicht mehr stillschweigend durch alte, veraltete Aggregatwerte aus dem globalen Profil überschrieben, was Falschberechnungen an der Engine-Schnittstelle zuverlässig verhindert.
* **Was könnte brechen:** Falls ein Profil fehlerhafte Altdaten enthält, führt der fail-closed Zustand nun zum Abbruch der Berechnungen und einer Fehlermeldung. Die Bereinigung dieser Altdaten erfolgt in Slice 09.

### 2. Findings

* **G6-01 (Kompilierungsabhängigkeit von Alt-Depot und Anleihen):** Anleihen werden zur Abwärtskompatibilität der Engine weiterhin in `neubestand` summiert, obwohl sie separat erfasst werden. Dies ist im Hardening-Plan so vorgesehen und stellt kein funktionales Risiko dar, muss aber bei künftigen Engine-Refactorings berücksichtigt werden.
  * *Entscheidung:* Akzeptiert.

### 3. Pre-Mortem

Angenommen, diese Implementierung verursacht in 3 Monaten einen Fehler im Produktivbetrieb – was ist die wahrscheinlichste Ursache?
> Ein Benutzer wechselt in einem Profilverbund-Szenario ein Profil, bei dem ein Tranchenbestand nicht lesbar/verfügbar ist. Da die Berechnung nun fail-closed blockiert, stürzt die gesamte Haushaltsattribuierung mit einem `TRANCHE_STORAGE_CORRUPT` Fehler ab. Das ist zwar fachlich korrekt, führt aber zu einer Blockade der App, bis die Tranchen manuell im Manager bereinigt werden.

### 4. Review-Ergebnis

* **Status:** freigegeben
* **Blocker:** keine
* **Restrisiken:**
  * Blockade der Haushaltsberechnung bei einzelnen fehlerhaften Profiltranchen (fail-closed).
  * Abwärtskompatibilitäts-Zusatzkopplung von Anleihen an `neubestand`.

## Review-Feedback von Claude

Ausstehend: Einheitenfluss, Reader-/Statusvertrag, TQF-Berechnung und Modulgrenzen.

## Review-Antworten von Codex

Ausstehend.

## Review-Entscheidungen

| ID | Quelle | Finding | Entscheidung | Umsetzung |
| --- | --- | --- | --- | --- |
| - | - | Noch kein Review | offen | - |
