# Slice Tranchenmanagement 08: Expliziter Reconciliation-Workflow

**Feature-Branch:** `codex/tranchenmanagement-hardening`
**GitHub-Status:** lokal; Veröffentlichung ausstehend
**Status:** geplant – O-09 entschieden, Planreview ausstehend
**Abhängigkeiten:** Slices 03, 06 und 07 abgeschlossen und freigegeben
**GAPs:** TM-15

## Ziel

Die Produktgrenze zwischen beratender Entnahmeempfehlung und realer Depotfortschreibung wird durch einen bestätigten, idempotenten Reconcile-Pfad umgesetzt. Empfehlungen und Simulationen bleiben strikt schreibfrei; ausschließlich eine separat bestätigte tatsächliche Ausführung darf den Realbestand verändern.

## Verbindliche Nutzerentscheidung O-09

Der Nutzer hat am 2026-07-14 Möglichkeit A festgelegt:

- Nutzer erfassen nach der tatsächlichen Broker-Ausführung die realen Verkaufsdaten.
- Eine Vorschau zeigt alten und resultierenden Bestand.
- Erst eine ausdrückliche Bestätigung passt den Realbestand atomar an.
- Eine stabile `actionId` verhindert die doppelte Anwendung derselben Ausführung.
- Plan-, Simulator- und Balance-Ergebnisse mutieren den Realbestand niemals automatisch.

## Akzeptanzkriterien

- UI und Dokumentation unterscheiden klar Empfehlung, geplante Aktion und bestätigte reale Ausführung.
- Kein Berechnungs-, Seitenwechsel- oder Simulatorereignis verändert `depot_tranchen` automatisch.
- Der explizite Reconcile-Contract ist mit Verantwortungsgrenze und Recovery-Pfad in Plan und Referenzdokumentation festgehalten.
- Tests beweisen, dass beratende Ausgaben den Realbestand unverändert lassen.
- Vor dem Schreiben zeigt eine Vorschau Profil, Tranche, Ist-Bestand, tatsächliche Menge/Erlös/Kosten und resultierenden Bestand.
- Bestätigung ist ausdrücklich und nennt die dauerhafte Bestandsänderung; Abbruch ist ohne Seiteneffekt möglich.
- Jede Ausführung besitzt eine stabile `actionId`; erneutes Einspielen derselben Aktion ist idempotent und verändert den Bestand nicht zweimal.
- Profilherkunft und Tranche werden über explizite IDs, nicht Namen oder Stringsuffixe, aufgelöst.
- Teilverkauf reduziert Stückzahl, Marktwert und Einstandskosten nach dem reviewten Vertrag; Werte werden nie negativ.
- Abweichungen zwischen Empfehlung und tatsächlicher Ausführung sind zulässig und nachvollziehbar, werden aber nicht still umgedeutet.
- Validierung und Persistenz erfolgen atomar im Rahmen der vorhandenen Facade; ein Flushfehler lässt den letzten bestätigten Bestand und die Aktion retryfähig.
- Ein Recovery-/Audit-Datensatz enthält keine unnötigen personenbezogenen oder exportierten Finanzdaten.
- Parallel geöffnete Profile oder Tabs können keine Aktion auf den falschen Profilbestand anwenden.

## Scope

- Sichtbarer Reconcile-Contract.
- Reine Reconcile-Funktion, Vorschau/Bestätigung, Idempotenz und atomare Persistenz.
- Regression gegen unbeabsichtigte Rückschreibung aus Balance/Simulator.

## Nicht-Scope

- Kein Broker-Import, Order-Routing oder automatischer Depotabgleich.
- Keine rückwirkende Rekonstruktion historischer Transaktionen.
- Keine neue Buchhaltungs- oder Audit-Datenbank.
- Keine Änderung der Engine-Verkaufsstrategie.

## Geplante Programmdateien

Maximal neun:

- `app/tranches/tranche-reconciliation.js` (neu)
- `app/balance/balance-annual-orchestrator.js`
- `app/balance/balance-action-postprocessor.js`
- `app/tranches/tranchen-manager-page.js`
- `Balance.html`
- `tests/tranche-reconciliation.test.mjs` (neu)
- `tests/balance-annual-workflow-contract.test.mjs`
- `tests/profile-storage.test.mjs`
- `tests/persistence.test.mjs`

Wenn die tatsächliche Umsetzung weitere Programmdateien verlangt, greift vor dem ersten Edit die Stop-/Neuplanungsregel.

## Git- und Diff-Risiko vor Coding

```text
git branch --show-current: AUSSTEHEND
git status --short: AUSSTEHEND
Produktentscheidung O-09: entschieden – explizites Reconcile
```

Geplante Dateien:

- höchstens die neun oben genannten Programmdateien sowie Slice-/Plan-MD.

Voraussichtliche Änderungstiefe:

- riskant; dauerhafte reale Bestandsmutation hinter einem bestätigten Reconcile-Contract.

Gefährdete bestehende Tests:

- Balance-Jahresworkflow und Action Postprocessing,
- Profilpersistenz, IndexedDB/Tauri und Snapshots,
- Tranchenstatus, Transaction Tax und Browser-Smoke,
- Idempotenz bei Reload/Retry.

Nicht anfassen:

- Broker- oder Bankzugänge,
- Simulatorbestand als Realbestand,
- Engine-Semantik und historische Snapshots,
- reale lokale Nutzerdaten,
- `engine.js`, `dist/`, Release-Artefakte.

Rollback-Strategie:

- auf den freigegebenen Slice-07-Commit zurück; Reconcile-Funktion, UI und Persistenzadapter nicht partiell zurückrollen. Neu angelegte Dateien nur nach dokumentierter Freigabe entfernen.

## Geplante Tests

```powershell
node tests/run-single.mjs tests/tranche-reconciliation.test.mjs
node tests/run-single.mjs tests/balance-annual-workflow-contract.test.mjs
node tests/run-single.mjs tests/profile-storage.test.mjs
node tests/run-single.mjs tests/persistence.test.mjs
npm test
npm run test:browser
```

Pflichtfälle: Vorschau/Abbruch, Teil-/Vollverkauf, unbekannte/gelöschte Tranche, falsches Profil, gleiche `actionId` zweimal, Flush-Rejection/Retry, zwei Tabs, reine Empfehlung ohne Mutation und unveränderter Simulatorinput.

## Ergebnisse

Noch nicht umgesetzt; O-09 ist entschieden.

## Durchgeführte Änderungen

Noch nicht umgesetzt.

## Ausgeführte Tests

Noch nicht umgesetzt.

## Abweichungen vom Plan

Keine; Umsetzung und Planreview ausstehend.

## Offene Risiken

- Ohne Brokerbeleg bleibt eine tatsächliche Ausführung eine manuelle Nutzereingabe.
- Idempotenz benötigt einen dauerhaft gespeicherten, datensparsamen Aktionsschlüssel.
- Eine scheinbar kleine UI-Änderung kann zu einer neuen fachlichen Transaktionssemantik werden; dann ist zu stoppen.

## Rückdokumentation

- Tatsächlichen Reconcile-Contract, Verantwortungsgrenze und Dateiumfang nach Umsetzung in Hauptplan/GAP-Analyse zurückdokumentieren.
- Nutzerworkflow und technische Referenzen in Slice 09 synchronisieren.

## Freigabestatus

Nicht freigegeben. Datenintegritätsreview des festgelegten Reconcile-Contracts ausstehend.

## Review-Feedback von Gemini

Ausstehend: adversarial Doppelausführung, falsches Profil, Crash/Retry, Produktgrenze und Pre-Mortem.

## Review-Feedback von Claude

Ausstehend: Idempotenz-/Persistenzvertrag, UI-Bestätigung, Datenminimierung und Modulgrenzen.

## Review-Antworten von Codex

Ausstehend.

## Review-Entscheidungen

| ID | Quelle | Finding | Entscheidung | Umsetzung |
| --- | --- | --- | --- | --- |
| - | - | Noch kein Review | offen | - |
