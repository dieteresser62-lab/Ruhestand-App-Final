# Refactoring: Balance-Update-Pipeline entlasten

Status: `[x]` umgesetzt

Backlog-Referenz: `docs/internal/REFACTORING_BACKLOG.md`, Punkt `7. Balance-Update-Pipeline entlasten`

Startdatum: 2026-04-24

## Ziel

`app/balance/balance-main.js` soll im `update()`-Pfad klarer als Pipeline lesbar werden: `read -> prepare -> simulate -> postprocess -> render -> persist`. 3-Bucket-Postprocessing, Engine-State-Vorbereitung, Renderer-/Diagnose-Payload und Ausgabenbudget werden aus dem Inline-Block herausgezogen.

## Ausgangslage

`update()` in `balance-main.js` vermischt vor dem Refactoring:

- Profilwerte synchronisieren
- Inputs lesen
- Profilverbund vorbereiten
- Guardrail-State resetten
- Engine aufrufen
- Profilverbund-Actions mergen
- 3-Bucket fuer Single-Profil anwenden
- Renderer-Payload bauen
- Diagnose-Daten anreichern
- Profilverbund- oder Single-State persistieren
- Ausgabenbudget fortschreiben

## Nicht-Ziele

- Keine Aenderung an Engine-Vertraegen oder `EngineAPI`.
- Keine Aenderung an `engine.js`.
- Keine fachliche Aenderung an 3-Bucket-Logik.
- Keine Aenderung am Profilverbund-Datenvertrag.
- Keine Aenderung am Storage-Format.

## Schnittstellen-Regeln

- `balance-main.js` bleibt Entry-Point der Balance-App.
- Neue Helfer bekommen explizite Parameter statt globaler Context-Objekte.
- Postprocessing darf `modelResult.ui.action` nur an einer dokumentierten Stelle ueberschreiben.
- Single-Profil- und Profilverbund-Pfade bleiben getrennt testbar.
- Diagnose-Anreicherung darf keine Renderer-Seiteneffekte ausloesen.

## Geplante Modulstruktur

- `app/balance/balance-update-pipeline.js`
  - Engine-Last-State vorbereiten
  - Renderer-Payload bauen
  - Diagnose-Payload anreichern
  - Ausgabenbudget aus UI/Input berechnen
- `app/balance/balance-action-postprocessor.js`
  - Profilverbund-Merge als Postprocessing-Schritt anwenden
  - Single-Profil-3-Bucket-Postprocessing kapseln

## Umsetzungsschritte

### Step 1: Engine-State-Vorbereitung extrahieren

Soll:

- Guardrail-Reset-Entscheidung und Tax-State-Erhalt aus `update()` herausziehen.
- Rueckgabe bleibt `lastState` fuer `EngineAPI.simulateSingleYear()`.

Ist:

- Umgesetzt in `app/balance/balance-update-pipeline.js`.
- `prepareEngineLastState()` kapselt Guardrail-Reset-Entscheidung und Erhalt von `lastState.taxState`.

### Step 2: Action-Postprocessing extrahieren

Soll:

- Profilverbund-Merge in einen benannten Postprocessing-Schritt verschieben.
- Single-Profil-3-Bucket-Postprocessing aus `update()` entfernen.
- `threeBucketDiagnosis` fuer Diagnose weiter zurueckgeben.

Ist:

- Umgesetzt in `app/balance/balance-action-postprocessor.js`.
- `postprocessBalanceAction()` wendet zuerst den Profilverbund-Merge an und kapselt danach Single-Profil-3-Bucket-Postprocessing.
- `threeBucketDiagnosis` wird weiterhin fuer die Diagnose zurueckgegeben.

### Step 3: Renderer- und Diagnose-Payload extrahieren

Soll:

- Renderer-Payload `{ ...modelResult.ui, input }` zentral bauen.
- Diagnose-Anreicherung fuer Transaktionsdiagnostik, VPW und 3-Bucket kapseln.

Ist:

- Umgesetzt in `app/balance/balance-update-pipeline.js`.
- `buildBalanceRendererPayload()` baut den Renderer-Payload.
- `enrichBalanceDiagnosisPayload()` haengt Transaction Diagnostics, VPW und 3-Bucket-Diagnose an.

### Step 4: Persistenz und Ausgabenbudget lesbarer machen

Soll:

- Single-vs-Profilverbund-Persistenz im `update()`-Pfad klar benennen.
- Ausgabenbudget-Berechnung aus `update()` auslagern.

Ist:

- Umgesetzt in `app/balance/balance-update-pipeline.js`.
- `persistBalanceUpdate()` trennt Single- und Profilverbund-Persistenz.
- `calculateExpensesBudget()` berechnet Monats-/Jahresbudget fuer den Ausgaben-Check.

### Step 5: Tests und Doku

Soll:

- Gezielt ausfuehren:
  - `node tests/run-single.mjs tests/balance-smoke.test.mjs`
  - `node tests/run-single.mjs tests/balance-decumulation.test.mjs`
  - `node tests/run-single.mjs tests/profilverbund-balance.test.mjs`
- Danach `npm test`.
- Backlog und Referenzdoku aktualisieren.

Ist:

- Direkte Helfertests in `tests/balance-decumulation.test.mjs` ergaenzt.
- Gezielt ausgefuehrt:
  - `node tests/run-single.mjs tests/balance-decumulation.test.mjs`
  - `node tests/run-single.mjs tests/balance-smoke.test.mjs`
  - `node tests/run-single.mjs tests/profilverbund-balance.test.mjs`
- Vollstaendig ausgefuehrt:
  - `npm test`

## Risiko-Checkliste

- [x] Single-Profil-Update ruft Engine weiter genau einmal pro Update.
- [x] Profilverbund-Pfad persistiert weiter pro Profil.
- [x] 3-Bucket-Diagnose wird weiter an Diagnose-Payload angehaengt.
- [x] 3-Bucket-Single-Pfad wendet Bond-Replenishment weiter an.
- [x] Ausgabenbudget nutzt weiter monatliche Entnahme plus fixe Jahreseinkuenfte / 12.
- [x] Bestehende Balance-Tests bleiben gruen.

## Abschlussdokumentation

- Abschlussdatum: 2026-04-24
- Commit: noch nicht erstellt
- Geaenderte Dateien:
  - `app/balance/balance-main.js`
  - `tests/balance-decumulation.test.mjs`
  - `docs/internal/REFACTORING_BACKLOG.md`
  - `docs/internal/README.md`
  - `docs/internal/REFACTORING_BALANCE_UPDATE_PIPELINE.md`
  - `docs/reference/TECHNICAL.md`
  - `docs/reference/BALANCE_MODULES_README.md`
- Neu angelegte Dateien:
  - `app/balance/balance-update-pipeline.js`
  - `app/balance/balance-action-postprocessor.js`
- Entfernte/verschobene Logik:
  - Guardrail-/Tax-State-Vorbereitung aus `update()` nach `prepareEngineLastState()`.
  - Profilverbund-Action-Merge und Single-3-Bucket-Postprocessing nach `postprocessBalanceAction()`.
  - Renderer-Payload, Diagnose-Anreicherung, Persistenzentscheidung und Ausgabenbudget-Berechnung nach `balance-update-pipeline.js`.
- Tests:
  - `node tests/run-single.mjs tests/balance-decumulation.test.mjs` erfolgreich
  - `node tests/run-single.mjs tests/balance-smoke.test.mjs` erfolgreich
  - `node tests/run-single.mjs tests/profilverbund-balance.test.mjs` erfolgreich
  - `npm test` erfolgreich, 69 Testdateien, 1196/1196 Assertions
- Offene Restpunkte:
  - Keine fuer diesen Refactoring-Step.
