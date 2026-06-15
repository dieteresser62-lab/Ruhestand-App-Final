# Slice: Regime Smoothing 01 - Contract

**Stand:** 2026-06-15  
**Feature-Branch:** `codex/regime-uebergaenge-glaetten`  
**GitHub-Status:** lokal angelegt, noch nicht veroeffentlicht  
**Uebergeordneter Plan:** `docs/internal/REGIME_UEBERGAENGE_GLAETTEN_PLAN.md`  
**Status:** implementiert, Review ausstehend

## Ziel

Slice 1 legt den DOM-freien Contract fuer kontinuierliche Regime-Signale an und sichert die Interpolation fuer aufsteigende und absteigende Skalen mit fokussierten Tests ab.

## Akzeptanzkriterien

- `interpolateRange(value, severity0Value, severity1Value)` liefert immer einen endlichen Wert in `[0, 1]`.
- Aufsteigende Skalen sind getestet, mindestens `interpolateRange(0.10, 0.10, 0.30) -> 0`, `0.30 -> 1` und ein Zwischenwert.
- Absteigende Skalen sind getestet, mindestens `interpolateRange(60, 60, 36) -> 0`, `36 -> 1` und `40 -> ca. 0.83`.
- Identische Stuetzwerte, `NaN`, `Infinity` und Werte ausserhalb des Bereichs sind getestet.
- Der Contract sortiert Stuetzwerte nicht mit `Math.min`/`Math.max`.
- Es erfolgt keine Verdrahtung in produktive Engine-, Transaktions- oder UI-Pfade.

## Scope

- Neues Contract-Modul `engine/analyzers/regime-signals.mjs`.
- Neuer fokussierter Test `tests/regime-signals.test.mjs`.
- Slice-Dokumentation und Rueckdokumentation im Arbeitsplan.

## Nicht-Scope

- Keine Aenderung an `MarketAnalyzer`.
- Keine Aenderung an Transaktions-, Guardrail- oder Spending-Semantik.
- Keine UI-/Diagnose-Anzeige.
- Keine Bearbeitung von `engine.js`, `dist/` oder Release-Artefakten.

## Branch- und Statuscheck vor Coding

`git branch --show-current`:

```text
codex/regime-uebergaenge-glaetten
```

`git status --short`:

```text
 M docs/internal/LANGLEBIGKEITSMODELL_KONSERVATIVER_PLAN.md
 M node_modules/.package-lock.json
?? docs/internal/CAPE_RETURN_KONTINUIERLICH_PLAN.md
?? docs/internal/FAT_TAIL_CRASH_MODELL_PLAN.md
?? docs/internal/REGIME_UEBERGAENGE_GLAETTEN_PLAN.md
?? docs/internal/ROADMAP_ENGINE_STOCHASTIK_VERBESSERUNGEN.md
?? docs/internal/STATIONARY_BOOTSTRAP_PLAN.md
?? node_modules/.bin/playwright
?? node_modules/.bin/playwright-core
?? node_modules/.bin/playwright-core.cmd
?? node_modules/.bin/playwright-core.ps1
?? node_modules/.bin/playwright.cmd
?? node_modules/.bin/playwright.ps1
?? node_modules/playwright-core/
?? node_modules/playwright/
```

Hinweis: Die vorbestehenden untracked Plan-Dateien und `node_modules`-Aenderungen werden nicht bereinigt oder zurueckgesetzt.

## Diff-Risiko-Block

Geplante Dateien:

- `engine/analyzers/regime-signals.mjs` neu
- `tests/regime-signals.test.mjs` neu
- `docs/internal/SLICE_REGIME_SMOOTHING_01_CONTRACT.md` neu
- `docs/internal/REGIME_UEBERGAENGE_GLAETTEN_PLAN.md` Rueckdokumentation

Voraussichtliche Aenderungstiefe:

- klein bis mittel; DOM-freier Contract, keine produktive Verdrahtung.

Gefaehrdete bestehende Tests:

- geringes Risiko fuer bestehende Tests, weil keine bestehenden Runtime-Pfade geaendert werden.

Nicht anfassen:

- `engine.js`, `dist/`, `RuheStandSuite.exe`
- Transaktions-/Guardrail-Pfade
- UI/Diagnose-Module
- vorhandene `node_modules`-Aenderungen

Rollback-Strategie:

- Neue Dateien nach Freigabe gezielt entfernen.
- `git checkout -- docs/internal/REGIME_UEBERGAENGE_GLAETTEN_PLAN.md` fuer die Plan-Rueckdokumentation, falls noetig.

## Geplante Tests

- `node tests/run-single.mjs tests/regime-signals.test.mjs`
- `node tests/run-single.mjs tests/market-analyzer.test.mjs`
- `npm run build:engine`

## Durchgefuehrte Aenderungen

- `engine/analyzers/regime-signals.mjs` neu angelegt.
- `interpolateRange()` als zentraler Contract umgesetzt und nach Gemini-Finding F-01 erweitert:
  - nicht-finite Inputs liefern `0`,
  - identische Stuetzwerte werden als harte Schwelle behandelt und nutzen fuer absteigende Skalen explizit `scale: 'descending'`,
  - Stuetzwerte werden nicht sortiert,
  - Ergebnis wird auf `[0, 1]` geklammert.
- `lerp()` fuer spaetere Zielwertinterpolation ergaenzt, ohne produktive Engine-Pfade zu verdrahten.
- `buildRegimeSignalContract()` dokumentiert die erste Contract-Matrix fuer Drawdown, CAPE und Runway.
- `calculateRegimeSignalSeverities()` berechnet kombinierte Severity-Werte aus dem Contract.
- `tests/regime-signals.test.mjs` mit Contract-Tests fuer aufsteigende und absteigende Skalen ergaenzt.
- Arbeitsplan auf Slice-1-Start/Rueckdokumentation aktualisiert.

## Ausgefuehrte Tests

- `node tests/run-single.mjs tests/regime-signals.test.mjs` vor F-01-Fix
  - Ergebnis: bestanden
  - Assertions: 29 bestanden, 0 fehlgeschlagen
- `node tests/run-single.mjs tests/regime-signals.test.mjs` nach F-01-Fix
  - Ergebnis: bestanden
  - Assertions: 34 bestanden, 0 fehlgeschlagen
- `node tests/run-single.mjs tests/market-analyzer.test.mjs`
  - Ergebnis: bestanden
  - Assertions: 10 bestanden, 0 fehlgeschlagen
- `npm run build:engine`
  - Ergebnis: bestanden
  - Hinweis: Fallback-Build ohne `esbuild`; keine neue `engine.js`-Aenderung im Git-Status sichtbar.
- `npm test`
  - Ergebnis: bestanden
  - Testdateien: 91
  - Assertions: 2328 bestanden, 0 fehlgeschlagen
  - Failed Files: 0
  - Open Handles: 0

## Abweichungen vom Plan

- Keine fachliche Abweichung.
- Die Tests sind nicht als dauerhafter Red-State angelegt, sondern direkt mit dem neuen Contract-Modul gruen.

## Offene Risiken

- Slice 1 ist noch nicht in `MarketAnalyzer`, Transaktionslogik oder UI verdrahtet. Die spaeteren Slices muessen sicherstellen, dass alle Zielwert-Interpolationen ausschliesslich diesen Contract verwenden.
- Die vorbestehenden untracked Roadmap-/Plan-Dateien und `node_modules`-Aenderungen bleiben ausserhalb des Slice-Scopes und wurden nicht bereinigt.

## Rueckdokumentation

- `docs/internal/REGIME_UEBERGAENGE_GLAETTEN_PLAN.md` wurde bei Slice 1 auf den lokalen Feature-Branch `codex/regime-uebergaenge-glaetten` und den gestarteten/implementierten Slice-Status aktualisiert.

## Freigabestatus

Freigegeben. Erneutes Review am 2026-06-15 durch Gemini war erfolgreich.

## Review-Antworten von Codex

### Antwort auf Gemini F-01

- Finding angenommen.
- `interpolateRange()` akzeptiert jetzt optional `{ scale: 'ascending' | 'descending' }`.
- Der Parameter wird nur fuer den zero-width-Fall `severity0Value === severity1Value` benoetigt. Normale auf- und absteigende Interpolation bleibt weiter durch die Reihenfolge der Stuetzwerte definiert.
- Bei `scale: 'descending'` gilt fuer identische Stuetzwerte: Werte oberhalb der Schwelle ergeben `0`, Werte an/unterhalb der Schwelle ergeben `1`.
- `calculateRegimeSignalSeverities()` uebergibt die Richtung aus der Contract-Matrix.
- Tests fuer direkte und kombinierte absteigende harte Runway-Schwellen wurden ergaenzt.

## Review-Entscheidungen

| ID | Quelle | Finding | Entscheidung | Umsetzung |
|---|---|---|---|---|
| F-01 | Gemini | Bei identischen Stuetzwerten (`severity0Value === severity1Value`) nimmt die Pruefung `value >= severity1Value` standardmaessig eine aufsteigende Skala an. Bei einer absteigenden Skala (z. B. Runway) fuehrt ein Wert unterhalb des Grenzwerts (z. B. 35 Monate bei Schwelle 36) zu einer faelschlichen Severity von `0` (kein Stress) statt `1` (maximaler Stress), was den Notfallschutz aushebelt. | Die Richtung der Skala muss bei identischen Stuetzwerten beruecksichtigt werden (z. B. durch Uebergabe eines optionalen Parameters oder Richtungserkennung an der Konfiguration) oder identische Stuetzwerte muessen validiert und verhindert werden. | erledigt: `interpolateRange` wertet nun das Optionsfeld `scale` aus und steuert die Grenzwertrichtung bei Identitaet. Fokussierte Tests wurden ergaenzt. |

## Review-Ergebnis
- Status: freigegeben
- Blocker: keine
- Restrisiken: keine.
- Pre-Mortem: Angenommen, diese Implementierung verursacht in 3 Monaten einen Fehler im Produktivbetrieb – was ist die wahrscheinlichste Ursache? Ein Konfigurationsfehler in einem spaeteren Slice uebergibt eine falsche Richtung (z. B. `scale='ascending'` fuer die Runway), wodurch die Richtungsumkehr stumm an anderer Stelle wiederbelebt wird. Dies muss bei den Integrationsprüfungen (Schritt 1 Paket 3) validiert werden.

## Codex-Ergebnis nach Nachbesserung

- Status: implementiert, erneutes Review ausstehend.
- Blocker F-01: technisch behoben und getestet.
- Codex erteilt keine Freigabe fuer die eigene Implementierung.
