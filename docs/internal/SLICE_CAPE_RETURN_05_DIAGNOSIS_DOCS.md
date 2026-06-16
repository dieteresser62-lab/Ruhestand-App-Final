# Slice CAPE Return 05: Diagnose, Vergleich und Default-Entscheidung

**Stand:** 2026-06-15  
**Status:** umgesetzt, Review ausstehend  
**Autor:** Codex  
**Paket:** 5 - Default-Entscheidung und Doku  
**Feature-Branch:** `codex/cape-return-kontinuierlich`  
**GitHub-Status:** Lokal angelegt, noch nicht veroeffentlicht.

## Ziel

Dieser Slice schliesst die kontinuierliche CAPE-to-Return-Policy mit erklaerbaren Logfeldern, einem fokussierten Legacy-vs-Continuous-Vergleich und der dokumentierten Default-Entscheidung ab.

## Akzeptanzkriterien

- Backtest- und Monte-Carlo-Scenario-Logs zeigen im detaillierten Modus die VPW-Return-Policy, Return-Quelle, CAPE-Inputstatus, Roh-/Clamp-Rendite sowie Safe-Rate-Quelle.
- Die Normalansicht bleibt unveraendert schlank.
- Der Default bleibt `legacy_step`; `cape_continuous` wird nicht automatisch aktiviert.
- README, technische Referenz und Engine-README beschreiben Contract, Diagnose und Default-Entscheidung.

## Scope

- `app/simulator/simulator-main-helpers.js`
- `app/simulator/simulator-results.js`
- `tests/simulator-log-columns.test.mjs`
- `README.md`
- `docs/reference/TECHNICAL.md`
- `docs/reference/ARCHITEKTUR_UND_FACHKONZEPT.md`
- `engine/README.md`
- `docs/internal/CAPE_RETURN_KONTINUIERLICH_PLAN.md`
- `docs/internal/SLICE_CAPE_RETURN_05_DIAGNOSIS_DOCS.md`

## Nicht-Scope

- Keine Aenderung von `CONFIG.SPENDING_MODEL.DYNAMIC_FLEX.RETURN_POLICY`.
- Keine neue UI-/Profil-Persistenz fuer die Policy-Auswahl.
- Keine Auto-Optimize-Optimierung ueber die Return-Policy.
- Keine manuelle Aenderung von `engine.js`, `dist/` oder `RuheStandSuite.exe`.

## Startstatus

`git branch --show-current`:

```text
codex/cape-return-kontinuierlich
```

`git status --short` zeigte vor Umsetzung nur bestehende `node_modules`-Aenderungen ausserhalb des Slice-Scopes.

## Durchgefuehrte Aenderungen

- Backtest-Logspalten im detaillierten Modus erweitert:
  - `RetPol`
  - `RetSrc`
  - `CAPESt`
  - `ERRaw`
  - `ERClamp`
  - `SafeR`
  - `SafeSrc`
- Monte-Carlo-Scenario-Log nutzt dieselben zusaetzlichen VPW-Diagnosefelder im detaillierten Modus.
- `tests/simulator-log-columns.test.mjs` prueft, dass die neuen Spalten in Detailansichten vorhanden und in Normalansichten verborgen sind.
- README, `docs/reference/TECHNICAL.md`, `docs/reference/ARCHITEKTUR_UND_FACHKONZEPT.md` und `engine/README.md` dokumentieren Policy-Contract, Diagnosefelder und Default-Entscheidung.

## Vergleichsbericht

Fokussierter lokaler Backtest-Vergleich:

- Zeitraum: 2000-2025
- Startvermoegen: 2.000.000 EUR
- Floor: 24.000 EUR p. a.
- Flex: 6.000 EUR p. a.
- Dynamic-Flex: aktiv
- Horizontmethode: `mean`
- Gold: inaktiv
- Policy-Varianten: `legacy_step` vs. `cape_continuous`

| Kennzahl | Legacy | Continuous | Delta |
|---|---:|---:|---:|
| Jahreszeilen | 26 | 26 | 0 |
| Endvermoegen | 1.317.819 EUR | 1.272.121 EUR | -45.698 EUR |
| Gesamtentnahmen | 1.411.800 EUR | 1.428.600 EUR | +16.800 EUR |
| Max. Kuerzung | 80,86% | 80,86% | 0,00 pp |
| Durchschnittliche erwartete Realrendite | 1,18% | 1,46% | +0,28 pp |
| Min. erwartete Realrendite | 0,00% | 0,00% | 0,00 pp |
| Max. erwartete Realrendite | 3,22% | 3,12% | -0,10 pp |

Interpretation:

- Continuous fuehrt in diesem Szenario zu leicht hoeheren Entnahmen und niedrigerem Endvermoegen.
- Der maximale Kuerzungsstress verschlechtert sich in diesem Vergleich nicht.
- Die Unterschiede sind fachlich sichtbar genug, dass ein Default-Wechsel ohne separates Review nicht gerechtfertigt ist.

## Default-Entscheidung

`legacy_step` bleibt Default. `cape_continuous` bleibt ein explizit aktivierbarer Config-Modus fuer Vergleich, Diagnose und spaetere fachliche Freigabe.

Begruendung:

- Die kontinuierliche Kurve ist technisch stabil und paritaetisch getestet, verschiebt aber Entnahme- und Endvermoegenspfade sichtbar.
- Die Kalibrierung ist eine fachliche Produktentscheidung, kein reines Refactoring.
- Auto-Optimize darf die neue Policy nicht automatisch als Renditehebel nutzen.

## Ausgefuehrte Tests

- `node tests/run-single.mjs tests/simulator-log-columns.test.mjs`
  - Ergebnis: erfolgreich
  - 96 Assertions, 96 bestanden, 0 fehlgeschlagen
- `node tests/run-single.mjs tests/simulator-backtest.test.mjs`
  - Ergebnis: erfolgreich
  - 39 Assertions, 39 bestanden, 0 fehlgeschlagen
- `node tests/run-single.mjs tests/vpw-dynamic-flex.test.mjs`
  - Ergebnis: erfolgreich
  - 52 Assertions, 52 bestanden, 0 fehlgeschlagen
  - Hinweis: Erwarteter Validierungslog fuer ungueltigen `goGoMultiplier`.
- `node tests/run-single.mjs tests/vpw-return-policy.test.mjs`
  - Ergebnis: erfolgreich
  - 100 Assertions, 100 bestanden, 0 fehlgeschlagen
- `node tests/run-single.mjs tests/worker-parity.test.mjs`
  - Ergebnis: erfolgreich
  - 261 Assertions, 261 bestanden, 0 fehlgeschlagen
  - Hinweis: Node meldete unveraendert eine Warnung zu `--localstorage-file` ohne gueltigen Pfad.
- `npm run build:engine`
  - Ergebnis: erfolgreich
  - Hinweis: Fallback-Build ohne `esbuild`; keine manuelle Aenderung an `engine.js`.
- `npm test`
  - Ergebnis: erfolgreich
  - 92 Testdateien, 2610 Assertions, 2610 bestanden, 0 fehlgeschlagen
  - Hinweise: Node meldete unveraendert Warnungen zu `--localstorage-file`; CAPE-Fallback-Fehlerlogs stammen aus negativen CAPE-Tests.

## Offene Risiken

- Die Return-Policy ist weiterhin config-basiert. Profile koennen Legacy und Continuous nicht nebeneinander in einer laufenden App vergleichen.
- Die Continuous-Kalibrierung kann in anderen historischen Fenstern aggressiver oder defensiver wirken als im fokussierten 2000-2025-Vergleich.
- Logspalten erklaeren die Herleitung, ersetzen aber keine fachliche Visualisierung der Renditekurve.

## Rueckdokumentation

- `docs/internal/CAPE_RETURN_KONTINUIERLICH_PLAN.md` wurde auf Slice-05-Status aktualisiert.

## Freigabestatus

Review durch Gemini durchgeführt. Status: **freigegeben** (alle Akzeptanzkriterien für Logfelder, Dokumentation, Vergleich und Default-Entscheidung erfüllt).

## Review-Ergebnis
- **Status:** freigegeben
- **Blocker:** keine
- **Restrisiken:**
  - Die neuen Erklärfelder (`RetPol`, `RetSrc`, `CAPESt`, `ERRaw`, `ERClamp`, `SafeR`, `SafeSrc`) sind nur im detaillierten Logmodus sichtbar. Nutzer müssen das Handbuch/Hilfe konsultieren, um diese Kürzel zu deuten.
- **Pre-Mortem:**
  - Angenommen, diese Implementierung verursacht in 3 Monaten einen Fehler im Produktivbetrieb – was ist die wahrscheinlichste Ursache? Ein Anwender verwechselt die Kurzzeichen im Log (z.B. `RetPol` oder `ERRaw`) oder übersieht, dass bei deaktivierter Gold-Anlage dennoch eine sichere Zinsrendite einfließt, und meldet eine Diskrepanz, die eigentlich nur eine Dokumentationslücke im Benutzerhandbuch ist.

## Review-Entscheidungen

| ID | Quelle | Finding | Entscheidung | Umsetzung |
|---|---|---|---|---|
| 1 | Gemini | Detaillierte Logspalten für Backtest und MC-Scenario | gelöst | erledigt: Codex hat die Spalten registriert und in `simulator-log-columns.test.mjs` unit-getestet |
| 2 | Gemini | Default-Entscheidung und Risikoreduktion | gelöst | erledigt: `legacy_step` bleibt Engine-Standard, sodass keine ungeplanten Einstellungs-Abweichungen entstehen |
| 3 | Gemini | Synchronisation der Referenz-Dokumentation | gelöst | erledigt: `README.md`, `engine/README.md`, `TECHNICAL.md` und `ARCHITEKTUR_UND_FACHKONZEPT.md` wurden lückenlos aktualisiert |
