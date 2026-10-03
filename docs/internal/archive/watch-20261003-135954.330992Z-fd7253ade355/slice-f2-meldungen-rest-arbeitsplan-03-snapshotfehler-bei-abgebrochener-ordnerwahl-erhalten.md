# Slice 3 von 5 – Snapshotfehler bei abgebrochener Ordnerwahl erhalten

<!-- audit:status:begin -->
Freigegeben in Runde 1 · 0 Befunde, 0 geschlossen · Validierung grün
<!-- audit:status:end -->

## Ziel

<!-- audit:goal:begin -->
H-04 an der tatsächlichen Ordnerknopfbindung und dem echten Storage-Handler beheben.
<!-- audit:goal:end -->

## Akzeptanzkriterien

<!-- audit:acceptance:begin -->
- SOURCE: Ein vorhandener Snapshotfehler bleibt während des offenen Dialogs und nach `AbortError` mit unverändertem Eintrag erhalten; weder Erfolgsmeldung noch `clearActionError('snapshots')` treten auf.
- SOURCE: Erst die bestätigte Verbindung entfernt den bisherigen Snapshotfehler. Verweigerte Berechtigung oder Handle-Speicherfehler ersetzen ihn durch den bestehenden Snapshot-Aktionsfehler; fremde Bereiche bleiben erhalten.
- SOURCE: Rückgabe, Ordnerhandle-Persistenz und Snapshotabläufe behalten ihre bisherigen Verträge. Node-Tests mit echtem `connectFolder()` und Browserabbruchprüfung decken die Aktion ab.
- SOURCE: Die gezielten Läufe für `balance-ui-orchestration.test.mjs` und `balance-smoke.test.mjs` bestehen; der Orchestrator führt `npm test` aus. Der Browserfall wartet auf den beobachteten Pickerabschluss und den Meldungszustand.
<!-- audit:acceptance:end -->

## Umfang

<!-- audit:scope:begin -->
- `app/balance/balance-binder.js`
- `app/balance/balance-storage.js`
- `docs/internal/f2-meldungen-rest-implement-review-e848a1f3.md`
- `docs/internal/slice-f2-meldungen-rest-arbeitsplan-03-snapshotfehler-bei-abgebrochener-ordnerwahl-erhalten.md`
- `tests/balance-smoke.test.mjs`
- `tests/balance-ui-orchestration.test.mjs`
- `tests/browser-smoke.test.mjs`
<!-- audit:scope:end -->

## Umsetzung

> - Das vorzeitige `clearActionError('snapshots')` aus der tatsächlichen Ordnerknopfbindung entfernt. Die bestehende Fehlerbehandlung der Bindung bleibt bestehen.
> - `connectFolder()` bereinigt den Snapshotbereich erst nach Ordnerwahl, erteilter Schreibberechtigung, erfolgreicher Handle-Persistenz und Übernahme des Handles in den Anwendungszustand. Abbruch, `Promise<void>`, Persistenzschlüssel, Fehlertexte, Erfolgstoast und Aufruf der Snapshotdarstellung behalten ihre bisherigen Verträge.
> - Der Orchestrierungstest verwendet die echte Knopfbindung und das echte `connectFolder()` mit steuerbaren Picker-, Berechtigungs- und Speicher-Promises. Er prüft Fehleridentität während jeder offenen Phase, Abbruch, Berechtigungsverweigerung, Speicherfehler, Erfolg, unveränderte fremde Bereiche und den bestehenden Handle-/Darstellungsvertrag.
> - Der Main-Smoke prüft zusätzlich mit echtem Renderer den identischen Meldungseintrag während des offenen Dialogs und nach `AbortError`, ohne Bereinigung oder Erfolgstoast. Berechtigungsverweigerung und Speicherfehler ersetzen den bisherigen Eintrag durch den bestehenden Snapshot-Aktionsfehler und erhalten den fremden Eintrag.
> - Der neue Browserfall `Balance folder abort` verwendet den tatsächlichen Ordnerknopf, den echten Storage-Handler und den echten Renderer. Nur der Betriebssystempicker wird testseitig ersetzt; dessen Abschluss und das Ende des Storage-Aufrufs werden beobachtet. Der Fall wartet anschließend auf den unveränderten, sichtbaren Meldungszustand und prüft Identität, fremden Bereich sowie ausbleibende Bereinigung und Meldungen. Keine festen Dialogwartezeiten oder Produkt-Testhooks; Instrumentierungen werden im `finally` zurückgesetzt.

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
> Korrektheit: Das vorzeitige `UIRenderer.clearActionError('snapshots')` wurde aus der Knopfbindung in `app/balance/balance-binder.js` entfernt. In `app/balance/balance-storage.js` steht es jetzt erst nach `_idbHelper.set('snapshotDirHandle', handle)` und der Übernahme von `appState.snapshotHandle`, also nach bestätigter Verbindung. Fehlerpfade: Verweigerte Berechtigung und ein Handle-Speicherfehler laufen weiter über den bestehenden catch-Zweig (StorageError 'Ordner konnte nicht verbunden werden.' mit originalError) und anschließend über `handleActionError(error, 'snapshots')` im Binder. AbortError wird weiterhin still verworfen. Verträge: `tests/balance-ui-orchestration.test.mjs` prüft mit echtem `connectFolder` über die echte `bindUI`-Bindung die Fälle abort, denied, storage-error und success, jeweils mit aufgeschobenen Promises für Dialog, Berechtigung und Speicherung. Abgedeckt sind die Fehleridentität in jeder offenen Phase, der fremde Bereich 'balance-import', der Rückgabewert void, der Persistenzschlüssel `snapshotDirHandle`, die `renderSnapshots`-Ziele, der Erfolgstext und `clears.join(',')==='snapshots'` nur bei Erfolg. `tests/balance-smoke.test.mjs` prüft dasselbe gegen den echten Renderer und den echten Main-Knopf (genau ein Listener). `tests/browser-smoke.test.mjs` (`runBalanceFolderAbort`) ersetzt nur den Picker, wartet auf `opened`, `settled` und `completed` und prüft Eintragsidentität, Text, fremden Bereich, clears/toasts=0 sowie das Ausbleiben neuer Meldungen; der Fall ist in `main()` registriert. Pfadgrenze: Alle Diffpfade liegen in der Slice-Allowlist. Validierung: `npm test` ist für Fingerprint [Hash ausgelassen]… mit PASS attestiert.

Größtes Restrisiko:
> Weitere Aufrufer von `StorageManager.connectFolder` (etwa ein Snapshotpfad ohne Handle) entfernen bei erfolgreicher Verbindung jetzt ebenfalls den Snapshotfehler. Das entspricht dem Vertrag „erst die bestätigte Verbindung entfernt den Fehler“, ist aber im Snapshot nur über den Diff und nicht über den vollständigen Quelltext der Aufrufer sichtbar. Den Browser-Smoke führt erst die gesteuerte Sitzung vor dem Merge aus.

Bruchbedingung:
> Die Freigabe wäre falsch, wenn `connectFolder` bei AbortError doch einen Fehler werfen oder `clearActionError` vor der Persistenz aufrufen würde. Die abort-, denied- und storage-error-Zweige in `tests/balance-ui-orchestration.test.mjs` (`clears.length===0`, identisches `oldError`) würden das unter dem attestierten `npm test` rot melden. Ebenso wäre sie falsch, wenn `runBalanceFolderAbort` im echten Browser rot wird.

Vorab-Risikoanalyse:
> Denkbarer Ausfall: Der Nutzer bricht die Ordnerwahl ab und die Snapshot-Meldung verschwindet trotzdem. Ursache könnte ein zweiter Listener oder ein verbliebener Clear-Aufruf an anderer Stelle sein. Die Smoke-Prüfung `listeners.click.length===1` und die Zählung `clears` mit echtem Renderer schließen das für die tatsächliche Bindung aus. Ein zweiter denkbarer Ausfall ist ein Leck von Testmocks in Folgetests. Beide Node-Tests stellen jedoch Picker, Renderer-Methoden, `_idbHelper.set`, `renderSnapshots` und `connectFolder` im finally-Block wieder her.
<!-- audit:approval:end -->

<!-- audit:reference:begin -->
Technischer Bezug: Lauf `watch-20261003-135954.330992Z-fd7253ade355`, Arbeitseinheit(en) 4; Nachweise in der Recordkette.
<!-- audit:reference:end -->
