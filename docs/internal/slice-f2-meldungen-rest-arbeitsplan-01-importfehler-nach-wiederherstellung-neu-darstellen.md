# Slice 1 von 5 – Importfehler nach Wiederherstellung neu darstellen

<!-- audit:status:begin -->
Freigegeben in Runde 1 · 0 Befunde, 0 geschlossen · Validierung grün
<!-- audit:status:end -->

## Ziel

<!-- audit:goal:begin -->
B-01 und W-01 beheben und mit echten JSON-/CSV-Handlern sowie beobachtbaren Ergebnissen absichern.
<!-- audit:goal:end -->

## Akzeptanzkriterien

<!-- audit:acceptance:begin -->
- SOURCE: Ein echter JSON-Import mit erfolgreichem Dry-Run und werfendem Replace, einschließlich Snapshot-/Storagefehler, rendert vor dem Aktionsfehler wieder mit den ursprünglichen Eingaben; die Wiederherstellungsvorschau verwendet ausschließlich `PREVIEW` und verursacht keinen zusätzlichen Speicherwrite.
- SOURCE: JSON-Finalfehler mit erfolgreichem Rollback erzeugen weiterhin `post_replace_validation_failed`; ein fehlgeschlagener Rollback behält `rollback_failed` und den Recovery-Hinweis. Beide Wege versuchen die Vorschau mit wiederhergestellten Feldern vor Ausgabe des Aktionsfehlers; die Vorschau selbst schreibt nicht und wirft den Aktionsfehler nicht aus dem Ablauf.
- SOURCE: Markt-CSV-Fälle für Replacefehler, `validateBalanceState` vor/nach Replace, Finalfehler und Provenienzbestätigungsfehler werden nach erfolgreichem Dry-Run gezielt ausgelöst. Felder und Provenienzanzeige sind wiederhergestellt, die Ergebnisse beziehen sich auf den wiederhergestellten Stand, und der bestehende CSV-Aktionsfehler bleibt sichtbar. Die Rollbackschritte und Fehlercodes bleiben erhalten.
- SOURCE: Mit echtem Renderer und echtem Main-Update verschwinden Berechnungsfehler aus abgelehnten Dry-Run- und Finaldaten samt `input-error` bei gültigem Ausgangsstand. Fremde Aktionsfehler bleiben bestehen; ein zusätzlich injizierter Fehler der Wiederherstellungsvorschau verhindert den ursprünglichen Importaktionsfehler nicht.
- SOURCE: Der Browser-Smoke vergleicht nach gescheitertem JSON-/CSV-Import KPI und Handlungsanweisung mit der zuvor erfassten gültigen Baseline und prüft den neu protokollierten Aktionsfehler. Die gesonderten Dateievents ohne gestarteten Import ergeben null Updates, null `clearError()`-Aufrufe und unveränderte Feldmarkierungen.
- SOURCE: Die gezielten Läufe für `balance-ui-orchestration.test.mjs` und `balance-smoke.test.mjs` bestehen; der Orchestrator führt danach `npm test` aus. Neue Browserfälle sind implementiert, ihr Lauf erfolgt außerhalb der Sandbox vor dem Merge.
<!-- audit:acceptance:end -->

## Umfang

<!-- audit:scope:begin -->
- `app/balance/balance-binder-imports.js`
- `docs/internal/f2-meldungen-rest-implement-review-e848a1f3.md`
- `docs/internal/slice-f2-meldungen-rest-arbeitsplan-01-importfehler-nach-wiederherstellung-neu-darstellen.md`
- `tests/balance-smoke.test.mjs`
- `tests/balance-ui-orchestration.test.mjs`
- `tests/browser-smoke.test.mjs`
<!-- audit:scope:end -->

## Umsetzung

> - Beide Import-Catch-Pfade warten nach Rollbackversuch und Feldwiederherstellung eine zusätzliche `BALANCE_UPDATE_MODE.PREVIEW` ab. CSV stellt vorher außerdem die Provenienzanzeige wieder her. Erst danach erscheint der bestehende sichere Aktionsfehler.
> - Die gemeinsame lokale Hilfsfunktion bereinigt ausschließlich Berechnungsfehler und Feldmarkierungen vor der Vorschau. Eine werfende Vorschau verhindert weder den ursprünglichen Import-/Recoveryfehler noch das Leeren des Dateifeldes. Fehler des wiederhergestellten Standes bleiben nach dessen erneuter Prüfung sichtbar. Fehlercodes, Recovery-Hinweise und Speichertransaktionen bleiben erhalten.
> - `balance-ui-orchestration.test.mjs` verwendet echte Importhandler mit gezielten Fehlern für JSON-Snapshot/Replace, Finalprüfung, Rollback und Wiederherstellungsvorschau sowie für CSV-Replace, Zustandsvalidierung vor/nach Replace, Finalprüfung und Provenienzbestätigung. Verzögert aufgelöste Vorschauen prüfen die Reihenfolge vor Ausgabe des Aktionsfehlers; Ausgangsfelder, Provenienzanzeige, Modi, Speicherwrites und Fehlercodes werden beobachtet.
> - `balance-smoke.test.mjs` kombiniert echte Importhandler, Main-Updates und Renderer mit einer eingabeabhängigen Engine-Fixture. Deutlich andere Importdaten erzeugen beobachtbar andere KPI und Handlungsanweisungen; die Wiederherstellung wird vor dem Aktionsfehler mit einer zuvor berechneten Baseline verglichen. Echte Validierungsfehler im Dry-Run und Finalpfad, die werfende Wiederherstellungsvorschau und ein ungültiger Ausgangsstand sichern den Berechnungsfehlerlebenszyklus ab. Fremde Aktionsfehler bleiben erhalten.
> - Der neue Browserfall `Balance import restoration` benutzt die regulär gebundenen Datei-Importhandler für JSON-Snapshot/Replacefehler, JSON-Finalfehler mit echtem Rollback und CSV-Snapshot/Replacefehler. Er vergleicht KPI, Handlungsanweisung, Felder, Provenienzanzeige und gespeicherten Zustand mit der gültigen Baseline und prüft den neuen protokollierten Aktionsfehler. Eine getrennte Prüfung mit temporärem Dateiinput ohne Importhandler und echten Dateiinputs beobachtet null Updates, null Fehlerbereinigungen, null entprellte Vormerkungen und unveränderte Markierungen. Testinstrumentierungen werden zurückgesetzt.

## Abweichungen vom Plan

> Keine.

## Verlauf

<!-- audit:history:begin -->
- Runde 1: Umsetzung · Validierung grün · Prüfurteil freigegeben · 0 neu, 0 geschlossen.
<!-- audit:history:end -->

## Befunde

<!-- audit:findings:begin -->
Keine.
<!-- audit:findings:end -->

## Validierung

<!-- audit:validation:begin -->
- Runde 1: `npm test` · grün · Exitcode 0.
<!-- audit:validation:end -->

## Abschlussprüfung

<!-- audit:approval:begin -->
Geprüft:
> Geprüft wurden der vollständige Diff in app/balance/balance-binder-imports.js, tests/balance-smoke.test.mjs, tests/balance-ui-orchestration.test.mjs und tests/browser-smoke.test.mjs. Alle Pfade liegen in der Slice-Allowlist. Die Attestation validation-[Hash ausgelassen] passt zum Fingerprint [Hash ausgelassen]…; `npm test` ist PASS. Zur Korrektheit: `previewRestoredInputs()` ruft `UIRenderer.clearError()` auf, wartet `update({ mode: BALANCE_UPDATE_MODE.PREVIEW })` ab und fängt dabei jeden Fehler. Im JSON-Pfad läuft die Funktion nach `restoreInputUiState`, im CSV-Pfad nach `renderMarketDataProvenance`, jeweils vor `handleActionError`. Zum Vertrag: Die Matrix in balance-ui-orchestration prüft für snapshot, replace, final, rollback und preview die exakten Modi (`preview,persist_inputs,preview` bzw. `preview,preview`), die Reihenfolge `preview,error`, `writes === 0` sowie die Codes `storage_failed`, `unexpected_import_error`, `post_replace_validation_failed` und `rollback_failed` samt Hinweis `Import-Recovery-Snapshot`. Die CSV-Matrix deckt replace, validate-before, validate-after, final und provenance ab. Geprüft werden Rollbackanzahl, wiederhergestellte Felder, Provenienz vor der Fehlerausgabe und der Präfix `CSV-Import fehlgeschlagen:`. balance-smoke nutzt den echten Renderer und das echte Main-Update. Vor der Fehlerausgabe müssen `error-container` leer sein und `input-error` fehlen; Baseline-KPI und fremder Aktionsfehler bleiben erhalten. Der injizierte Vorschaufehler lässt den Importfehler sichtbar. Dateievents erzeugen null `clearError`- und Simulate-Aufrufe. Im Browser-Smoke sind die Fälle json-replace, json-final und csv-replace mit Baseline- und Protokollvergleich implementiert.

Größtes Restrisiko:
> Die Vorschau läuft jetzt auch bei Parse- und App-ID-Fehlern, also ohne gestarteten Dry-Run. Die angepassten Tests erwarten das ausdrücklich (`updateCalls` 2/3); es ist ungefährlich, aber eine Neuberechnung ohne Nutzen. Wirft die Vorschau, bleibt ein zuvor vorhandener eigener Berechnungsfehler des Ausgangsstands entfernt, bis das nächste Update läuft. Die neuen Browserfälle sind in der Sandbox nicht ausgeführt worden; das muss vor dem Merge außerhalb der Sandbox geschehen. Ob die Matrix-Mocks (`StorageManager.saveState`/`loadState`) wiederhergestellt werden, lässt sich aus den Hunks allein nicht ersehen. Die grüne volle Suite inklusive Test 4 spricht aber gegen ein Leck.

Bruchbedingung:
> Die Freigabe wäre falsch, wenn ein echter Main-Update im Modus PREVIEW doch persistiert oder eine entprellte Persistenz einplant. Ebenso, wenn `UIRenderer.clearError()` Aktionsfehler anderer Bereiche entfernt. Oder wenn ein Fehler aus `update` dem ursprünglichen Importfehler zuvorkommt. Die Assertions zu `storageWrites.length`, `actionText('expenses-import')` und zum Fall `preview` würden diese Fälle in der grünen Suite jedoch erkennen.

Vorab-Risikoanalyse:
> Wahrscheinlichster Fehlschlag nach dem Merge: Der Browser-Smoke `Balance import restoration` scheitert real an der CSV-Konfiguration oder am erwarteten Text 'Speicherung konnte nicht bestätigt werden'. Grund: Er lief nur außerhalb der Orchestrator-Validierung. Ein zweites Risiko ist die Annahme, dass die Vorschau mit `await` das Fehlerrendering des Main-Updates synchron abschließt, bevor `handleActionError` folgt. Ist `update` in der Produktion asynchron mit nachgelagerten Renderern, könnten KPI kurzzeitig veralten. Node-Tests mit echtem Main decken das synchrone Verhalten ab.
<!-- audit:approval:end -->

<!-- audit:reference:begin -->
Technischer Bezug: Lauf `watch-20261003-135954.330992Z-fd7253ade355`, Arbeitseinheit(en) 2; Nachweise in der Recordkette.
<!-- audit:reference:end -->
