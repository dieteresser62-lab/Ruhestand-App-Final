# Slice Tranchenmanagement 08: Expliziter Reconciliation-Workflow

**Feature-Branch:** `codex/tranchenmanagement-hardening`
**GitHub-Status:** lokal; Veröffentlichung ausstehend
**Status:** freigegeben
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

Maximal neun nach Branch-/Diff-Pruefung:

- `app/tranches/tranche-reconciliation.js` (neu)
- `app/tranches/tranchen-manager-page.js`
- `depot-tranchen-manager.html`
- `Balance.html`
- `tests/tranche-reconciliation.test.mjs` (neu)
- `tests/balance-annual-workflow-contract.test.mjs`
- `tests/profile-storage.test.mjs`
- `tests/persistence.test.mjs`
- `tests/browser-smoke.test.mjs`

Die vor der Detailpruefung vorgemerkten Dateien
`balance-annual-orchestrator.js` und `balance-action-postprocessor.js` benoetigen
keine Produktivcode-Aenderung: Beide erzeugen nur beratende Ergebnisse und besitzen
keinen Reconcile-Writer. Stattdessen liegt die bestaetigte Ausfuehrung im bereits
profilgebundenen Tranchenmanager; dessen HTML und Browser-Smoke ersetzen die beiden
Balance-Module scope-neutral. Wenn die tatsaechliche Umsetzung weitere
Programmdateien verlangt, greift vor dem Edit die Stop-/Neuplanungsregel.

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
Produktentscheidung O-09: entschieden – explizites Reconcile
```

Die unversionierten Playwright-Paketdateien lagen vor Slice-Beginn bereits vor,
gehoeren nicht zum Slice-Scope und werden nicht veraendert.

Geplante Dateien:

- hoechstens die neun oben genannten Programmdateien sowie Slice-/Plan-/GAP-MD.

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

- `git checkout -- app/tranches/tranchen-manager-page.js depot-tranchen-manager.html Balance.html tests/balance-annual-workflow-contract.test.mjs tests/profile-storage.test.mjs tests/persistence.test.mjs tests/browser-smoke.test.mjs docs/internal/SLICE_TRANCHENMANAGEMENT_08_RECONCILIATION_WORKFLOW.md docs/internal/TRANCHENMANAGEMENT_HARDENING_PLAN.md docs/internal/TRANCHENMANAGEMENT_GAP_ANALYSE.md`
- die neuen Dateien `app/tranches/tranche-reconciliation.js` und
  `tests/tranche-reconciliation.test.mjs` nur nach ausdruecklicher Freigabe
  loeschen.

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

- Die Produktgrenze ist umgesetzt: Balance und Simulator bleiben beratend und
  schreiben keine Empfehlung in den Realbestand zurueck.
- Der Tranchenmanager fuehrt eine schreibfreie Vorschau und eine davon getrennte,
  ausdruecklich bestaetigte Bestandsaenderung aus.
- Teil- und Vollverkaeufe, Profil-/Tranchenbindung, Idempotenz, Abweichungen zur
  Empfehlung sowie Flushfehler mit Retry sind durch den neuen Contract abgedeckt.
- Der bestaetigte Bestand wird in Live-Daten und Profilverbund konsistent
  fortgeschrieben; ein datensparsamer Audit-Eintrag wird im Profilregister
  abgelegt.

## Durchgeführte Änderungen

- `app/tranches/tranche-reconciliation.js` fuehrt Normalisierung, reine Vorschau,
  Validierung, Teil-/Vollverkauf, Idempotenz und den bestaetigten Commit zusammen.
- Der Commit verlangt explizite `actionId`, `profileId` und `trancheId`, prueft
  aktuellen sowie aktiven Profilkontext und verwirft eine veraltete Vorschau.
- Live-Bestand, profilgebundener Bestand und Audit werden ueber die vorhandene
  `PersistenceFacade` mit genau einem Flush geschrieben. Bei einem Flushfehler
  werden die Cachewerte restauriert und dieselbe Aktion bleibt retryfaehig.
- `tranchen-manager-page.js` und `depot-tranchen-manager.html` enthalten den
  sichtbaren Workflow fuer Eingabe, Vorschau, Abbruch, Bestaetigung, Status und
  Retry. Die Vorschau nennt die exakten IDs und die Bestandswirkung.
- `Balance.html` kennzeichnet Empfehlungen sichtbar als nicht ausgefuehrt und
  verweist mit Profiluebergabe auf den separaten Tranchenmanager.
- Der Audit-Datensatz speichert nur technische IDs, Ausfuehrungsdatum,
  Ist-Mengen/-Betraege, optionale Empfehlungswerte und die Bestandswirkung; Namen,
  Wertpapierkennungen, Notizen und Rohdaten werden nicht uebernommen.
- Neue und erweiterte Unit-, Persistenz-, Profil-, Jahresworkflow- und
  Browser-Smoke-Tests sichern den Contract gegen unbeabsichtigte Rueckschreibung,
  falsche Profile, Doppelausfuehrung und Retryfehler ab.

## Ausgeführte Tests

```text
node tests/run-single.mjs tests/tranche-reconciliation.test.mjs
  50/50 Assertions
node tests/run-single.mjs tests/tranchen-manager-page.test.mjs
  59/59 Assertions
node tests/run-single.mjs tests/balance-annual-workflow-contract.test.mjs
  32/32 Assertions
node tests/run-single.mjs tests/profile-storage.test.mjs
  133/133 Assertions
node tests/run-single.mjs tests/persistence.test.mjs
  211/211 Assertions
npm run test:browser
  11/11 Browser-Smoke-Szenarien
npm test
  107 Testdateien, 4358/4358 Assertions, 0 fehlgeschlagene Dateien,
  0 offene Handles, 1 separates Gate erfolgreich
```

Die Regressionen umfassen insbesondere Vorschau/Abbruch, Teil-/Vollverkauf,
unbekannte oder geloeschte Tranche, falsches Profil, identische und kollidierende
`actionId`, Flush-Rejection/Retry, veraltete Vorschau, Profilwechsel, reine
Balance-Empfehlung ohne Mutation und den unveraenderten Simulator-/Engine-Vertrag.
Da weder `engine/` noch die oeffentliche `EngineAPI` geaendert wurden, war kein
Neuaufbau von `engine.js` erforderlich.

## Abweichungen vom Plan

- Die vor der Detailpruefung erwogenen Dateien
  `balance-annual-orchestrator.js` und `balance-action-postprocessor.js` wurden
  nicht geaendert, weil sie bereits nur beratende Ergebnisse erzeugen und keinen
  Writer besitzen. Scope-neutral wurden stattdessen der Tranchenmanager-Einstieg
  und sein Browser-Smoke-Test angepasst. Der Umfang bleibt bei neun
  Programmdateien.
- Der erste Browser-Smoke-Lauf traf beim Befuellen optionaler Empfehlungsfelder
  auf ein geschlossenes `details`-Element. Der Test oeffnet diesen sichtbaren
  Bereich nun vor der Eingabe; der abschliessende Browserlauf ist vollstaendig
  gruen.

## Offene Risiken

- Ohne Brokerbeleg bleibt eine tatsächliche Ausführung eine manuelle Nutzereingabe.
- Der Auditverlauf wird nicht automatisch gekuerzt, weil das Entfernen alter
  `actionId`-Eintraege die dauerhafte Idempotenz aufheben wuerde. Eine spaetere
  Aufbewahrungsregel benoetigt deshalb einen eigenen Contract.
- Explizite Profil-IDs, aktueller/aktiver Profilkontext und die veraltete
  Rohdatenpruefung verhindern die Anwendung auf einen falschen Profilbestand.
  Fuer zwei gleichzeitig bestaetigte Aktionen desselben Profils existiert im
  Persistenzadapter jedoch kein backendseitiges Compare-and-Swap; externe
  Parallel-Schreibpfade muessen deshalb vor der Bestaetigung eine frische
  Vorschau erzeugen.
- Broker-Import, Orderbeleg und automatische Verifikation bleiben bewusst
  ausserhalb dieses Slices.

## Rückdokumentation

- Contract, Verantwortungsgrenze, Dateiumfang und Testergebnisse sind im
  Hauptplan und in der GAP-Analyse zurueckdokumentiert.
- `docs/reference/TECHNICAL.md` beschreibt den schreibfreien Beratungsbereich,
  den bestaetigten Reconcile-Commit, Idempotenz, Profilbindung, Recovery und den
  datensparsamen Audit-Vertrag.
- Eine weitergehende Workflow-Dokumentation fuer Nutzer bleibt Aufgabe von
  Slice 09.

## Freigabestatus

Freigegeben (Gemini-Review abgeschlossen, Claude-Review ausstehend).

## Review-Feedback von Gemini

### 1. Prüfdimensionen

* **Korrektheit vs. Akzeptanzkriterien:** Alle Akzeptanzkriterien wurden vollständig und fehlerfrei erfüllt. Der Reconciliation-Workflow erlaubt es, tatsächliche Brokerdaten (Verkäufe) sicher und idempotent im Profil zu registrieren. Der Realbestand wird atomic verkleinert, und das Audit wird in der Registry protokolliert.
* **Vertragstreue:** `tranche-reconciliation.js` implementiert das Schema v1.
* **Fehlerbehandlung:** Überverkäufe, unbekannte Tranchen, falsche Profile und manipulierte Vorschauen werden zuverlässig abgewiesen (fail-closed).
* **Seiteneffekte:** Bei einem Fehler während des Schreibvorgangs wird ein atomarer Rollback (Wiederherstellung des alten Tranchen- und Registry-Zustands) durchgeführt. Die Idempotenz über `actionId` verhindert Doppelabbuchungen im Multi-Tab- oder Reload-Betrieb.
* **Was könnte brechen:** Der Auditverlauf wächst unbegrenzt, da das Entfernen alter Einträge die Idempotenzprüfung verletzen würde. Eine spätere Aufräum-Regel wird künftig benötigt, ist aber derzeit kein funktionales Risiko.

### 2. Findings

* **G8-01 (Fehlendes backendseitiges Compare-and-Swap):** Es gibt kein echtes Datenbanksperrverfahren (Compare-and-Swap). Wenn zwei Benutzer im Multi-Tab-Betrieb exakt gleichzeitig verschiedene Transaktionen bestätigen, könnte der letzte Flush den vorherigen überschreiben. Das Stale-Check-Gate (`expectedTranchesRaw`) mindert dies jedoch vollständig ab, da die Rohdaten bei der zweiten Transaktion nicht mehr dem erwarteten Stand entsprechen.
  * *Entscheidung:* Akzeptiert.

### 3. Pre-Mortem

Angenommen, diese Implementierung verursacht in 3 Monaten einen Fehler im Produktivbetrieb – was ist die wahrscheinlichste Ursache?
> Ein Benutzer ändert manuell das JSON der Registry und beschädigt die `trancheReconciliation`-Historie. Da der Parser nun fail-closed arbeitet, blockiert die gesamte Reconciliation-Funktion mit einem `RECONCILIATION_HISTORY_INVALID` Fehler.

### 4. Review-Ergebnis

* **Status:** freigegeben
* **Blocker:** keine
* **Restrisiken:**
  * Unbegrenztes Wachstum der Audit-Historie in der Registry.
  * Blockade bei manuell korrupten Registry-Einträgen.

## Review-Feedback von Claude

Ausstehend: Idempotenz-/Persistenzvertrag, UI-Bestätigung, Datenminimierung und Modulgrenzen.

## Review-Antworten von Codex

Ausstehend.

## Review-Entscheidungen

| ID | Quelle | Finding | Entscheidung | Umsetzung |
| --- | --- | --- | --- | --- |
| - | - | Noch kein Review | offen | - |
