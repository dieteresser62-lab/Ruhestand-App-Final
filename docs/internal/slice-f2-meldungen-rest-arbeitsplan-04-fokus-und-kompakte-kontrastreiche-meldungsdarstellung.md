# Slice 4 von 5 – Fokus und kompakte kontrastreiche Meldungsdarstellung

<!-- audit:status:begin -->
Freigegeben in Runde 2 · 1 Befund, 1 geschlossen · Validierung grün
<!-- audit:status:end -->

## Ziel

<!-- audit:goal:begin -->
H-02 und H-05 mit messbaren Fokus-, ARIA-, Kontrast- und Layoutprüfungen erledigen.
<!-- audit:goal:end -->

## Akzeptanzkriterien

<!-- audit:acceptance:begin -->
- SOURCE: Jeder Schließenknopf heißt zugänglich exakt „Fehlermeldung schließen“ und beschreibt sich über die eindeutige Text-ID. Mehrere Fehler und Fehlerersatz erzeugen keine doppelten IDs oder verwaisten Beschreibungsbezüge.
- SOURCE: Tastatur-Schließen übergibt Fokus an den nächsten bzw. verbleibenden Schließenknopf, beim letzten Fehler an `#openDiagnosisBtn`; `activeElement` ist nie `BODY`. Schließen löst weiterhin weder Berechnung noch Speicherzugriff aus. Automatische Bereinigung und veraltete Schließenknöpfe ziehen keinen Fokus ab.
- SOURCE: Aktionsfehler haben nur einen sichtbaren Rahmen, während der Berechnungsfehlerrahmen unverändert bleibt. Erfolg-, Hinweis- und Fehlertoast erreichen mit ihren errechneten Vorder-/Hintergrundfarben jeweils mindestens 4,5:1 Textkontrast.
- SOURCE: Mehrere lange Aktionsfehler halten die festgelegte maximale Listenhöhe ein. Alle Texte und Knöpfe sind durch Scrollen/Tastaturnavigation erreichbar; bei 375 px Breite entsteht kein horizontaler Überlauf. Toasts und Aktionsfehler bleiben im Druck ausgeblendet.
- SOURCE: Die gezielten Läufe für `balance-messages.test.mjs` und `balance-smoke.test.mjs` bestehen; der Orchestrator führt `npm test` aus. Browserprüfungen für Fokus, Kontrast und Layout sind implementiert und werden vor dem Merge extern ausgeführt.
<!-- audit:acceptance:end -->

## Umfang

<!-- audit:scope:begin -->
- `Balance.html`
- `app/balance/balance-renderer.js`
- `css/balance.css`
- `docs/internal/f2-meldungen-rest-implement-review-e848a1f3.md`
- `docs/internal/slice-f2-meldungen-rest-arbeitsplan-04-fokus-und-kompakte-kontrastreiche-meldungsdarstellung.md`
- `tests/balance-messages.test.mjs`
- `tests/balance-smoke.test.mjs`
- `tests/browser-smoke.test.mjs`
<!-- audit:scope:end -->

## Umsetzung

> > > - Jeder Aktionsfehlertext erhält eine fortlaufende eindeutige ID, die auch bei Fehlerersatz und Renderer-Neuinitialisierung nicht wiederverwendet wird. Alle Schließenknöpfe heißen zugänglich exakt „Fehlermeldung schließen“ und verweisen mit `aria-describedby` auf ihren eigenen Text.
> > > - Ein gültiger manueller Schließvorgang fokussiert den nächsten Knopf, am Listenende den vorherigen verbleibenden Knopf und beim letzten Fehler `#openDiagnosisBtn`. Identitäts- und Elternprüfung machen alte Knöpfe wirkungslos. Automatische Bereichsbereinigung und Neuinitialisierung setzen keinen Fokus.
> > > - Die Aktionsfehlerliste hat höchstens `min(16rem, 30vh)` Höhe, vertikales Scrollen und einen Tastaturzugang zur gesamten Liste. Kleinere Abstände und Innenabstände halten die Einträge kompakt. Der innere Fehlertextrahmen wird ausschließlich im Aktionskanal neutralisiert; der Berechnungsfehlerrahmen bleibt unverändert.
> > > - Alle drei Toasttypen erhalten lokale explizite Vorder- und Hintergrundfarben; die globalen Produktfarben bleiben unverändert. Symbole, Formen, Meldungstexte, Laufzeit und Druckausblendung behalten ihre Verträge.
> > > - `balance-messages.test.mjs` prüft exakte Namen, Beschreibungsbezüge, eindeutige IDs, Ersatz, Neuinitialisierung, Fokusübergabe und wirkungslose alte Knöpfe. Der Main-Smoke ergänzt die Fokusübergabe mit echtem Renderer und bestätigt ausbleibende Berechnungen, Speicherreads und Writes. Ausstehende Writes vorheriger Updates werden vor der zusätzlichen Messung explizit abgeschlossen.
> > > - Der neue Browserfall `Balance message presentation` prüft tatsächliche Tastaturaktionen mit Enter und Space, `activeElement`, eindeutige vorhandene Beschreibungen, wirkungslose Ersatzknöpfe, passive automatische Bereinigung, Rahmenbreiten, WCAG-Textkontrast aus errechneten CSS-Farben, maximale Listenhöhe, ungekürzte Langtexte, Tastaturscrollen, Tab-Erreichbarkeit aller Knöpfe, horizontalen Überlauf bei 375 px und Druckausblendung. Testseitige Instrumentierung bleibt im eigenen Browserkontext; Produkt-Testhooks wurden nicht ergänzt.
> >
> > ### Gezielte Prüfnachweise der Umsetzung
> >
> > - `node tests/run-single.mjs tests/balance-messages.test.mjs`: grün, 155 Assertions.
> > - `node tests/run-single.mjs tests/balance-smoke.test.mjs`: grün, 171 Assertions, einschließlich der zusätzlichen Import-Fokusprüfung.
> > - `node --check tests/browser-smoke.test.mjs` und `git diff --check`: grün.
> > - `node tests/browser-smoke.test.mjs '--only=Balance message presentation'`: in der Sandbox nicht ausführbar, Serverstart scheitert mit `listen EPERM: operation not permitted 127.0.0.1`. Keine Browsermessungen ausgeführt; der fokussierte Browserfall und der vollständige Browser-Smoke sind vor dem Merge extern auszuführen.
> > - Die volle Suite wurde nicht vom Implementierer ausgeführt; `npm test` folgt durch den Orchestrator. Keine eigene Freigabe.
>
> ### Korrektur zu R-01 · Runde 2
>
> - Der Befund wird angenommen: Die leere Aktionsfehlerliste erzeugte einen unsichtbaren Tab-Stopp. `Balance.html` startet jetzt mit `tabindex="-1"` ohne `aria-label`. Der Renderer aktiviert `tabindex="0"` und die Beschriftung „Aktionsfehler“ erst bei vorhandenen Einträgen. Nach manueller oder automatischer Entfernung des letzten Fehlers werden beide Attribute zurückgesetzt. Neuinitialisierung bereinigt den alten und den neu gebundenen Container, auch wenn beide identisch sind.
> - `tests/balance-messages.test.mjs` prüft den initialen HTML-Zustand, Aktivierung beim ersten Fehler, verbleibende Einträge und Ersatz, Schließen des letzten Fehlers, automatische Bereinigung sowie Neuinitialisierung unterschiedlicher und identischer Container. Der Browserfall prüft Tab vom unmittelbar vorhergehenden Diagnoseknopf: Die leere Liste wird beim Start und nach manueller bzw. automatischer Bereinigung übersprungen; eine befüllte Liste bleibt per Tab erreichbar. Die bestehenden Tastaturscrollprüfungen bleiben erhalten.
> - `node tests/run-single.mjs tests/balance-messages.test.mjs`: grün, 180 Assertions.
> - `node tests/run-single.mjs tests/balance-smoke.test.mjs`: grün, 171 Assertions.
> - `node --check tests/browser-smoke.test.mjs` und `git diff --check`: grün.
> - `node tests/browser-smoke.test.mjs '--only=Balance message presentation'`: erneut vor Browserstart mit `listen EPERM: operation not permitted 127.0.0.1` gescheitert. Die Browserprüfung bleibt vor dem Merge extern auszuführen. Die volle Node-Suite führt allein der Orchestrator aus; keine eigene Freigabe.

## Abweichungen vom Plan

> Keine.

## Verlauf

<!-- audit:history:begin -->
- Runde 1: Umsetzung · Validierung grün · Prüfurteil abgelehnt · 1 neu, 0 geschlossen.
- Runde 2: Korrektur · Validierung grün · Prüfurteil freigegeben · 0 neu, 1 geschlossen.
<!-- audit:history:end -->

## Befunde

<!-- audit:findings:begin -->
### R-01 – Balance.html setzt `tabindex="0"` und `aria-label="Aktionsfehler"` dauerhaft auf `#action-error-container`

Klasse: Befund · Stand: geschlossen

Befund:
> Balance.html setzt `tabindex="0"` und `aria-label="Aktionsfehler"` dauerhaft auf `#action-error-container`. Ohne Aktionsfehler ist der Container leer. css/balance.css setzt dann über `#action-error-container:empty { padding: 0; }` auch das Padding auf 0, und ohne Inhalt bleibt die Höhe bei 0. Dadurch hat jede Balance-Seite im Normalzustand einen unsichtbaren Tab-Stopp zwischen Toast und KPI-Bereich. Tastaturnutzer landen dort auf einem Element ohne sichtbare Fläche und ohne erkennbaren Fokusring (WCAG 2.4.7). Screenreader lesen eine leere „Aktionsfehler“-Warnregion vor. Diese Regression kommt aus diesem Slice und läuft dem Slice-Ziel einer sauberen Fokusführung zuwider. Kein Test deckt den leeren Zustand ab: Die Browserprüfung fokussiert die Liste nur, wenn sie Einträge enthält.

Akzeptanztest:
> Im leeren Zustand darf `#action-error-container` nicht per Tab erreichbar sein. Erlaubt sind zum Beispiel: kein `tabindex` bzw. `tabindex="-1"`, solange keine Einträge vorhanden sind, und `tabindex="0"` erst ab dem ersten Eintrag, gesetzt und entfernt durch den Renderer in `handleActionError`/`clearActionError`/Neuinitialisierung. Sobald Einträge vorhanden sind, bleibt die Liste weiterhin per Tastatur scroll- und erreichbar. Nachweis über zwei Tests: (1) In tests/balance-messages.test.mjs oder tests/balance-smoke.test.mjs wird geprüft, dass der Container nach dem Schließen des letzten Fehlers und nach der Neuinitialisierung nicht fokussierbar ist (`tabindex` fehlt oder ist `-1`) und mit Einträgen `tabindex` `0` hat. (2) In tests/browser-smoke.test.mjs folgt bei leerer Liste auf den Tab-Schritt vor dem Container nicht der Container selbst.

Antwort des Implementierers, Runde 2 (angenommen):
> Leere Fehlerlisten haben jetzt tabindex="-1" ohne Beschriftung; vorhandene Einträge aktivieren tabindex="0". Schließen, automatische Bereinigung und Neuinitialisierung sind abgesichert. Gezielte Node-Tests bestehen mit 180 und 171 Assertions. Browser-Tabprüfung ergänzt und syntaktisch geprüft; Ausführung scheitert am sandboxbedingten Serverstart mit EPERM. Die volle Suite führt der Orchestrator aus.

Abschlussbegründung des Prüfers:
> Behoben im Diff: Balance.html setzt jetzt statisch `tabindex="-1"` ohne `aria-label`. `syncActionErrorAccessibility` in app/balance/balance-renderer.js setzt `tabindex` auf '0' und `aria-label` nur dann, wenn Einträge vorhanden sind; sonst setzt sie '-1' und entfernt die Beschriftung. Die Funktion wird in `handleActionError` nach dem Anhängen, in `clearActionError` und in `initUIRenderer` für den alten und den neuen Container aufgerufen. Abdeckung durch tests/balance-messages.test.mjs: `assertEmptyActionContainer` prüft `tabindex` '-1' und fehlendes `aria-label`. Geprüft wird das vor der Initialisierung, nach dem Schließen des letzten Fehlers (`annualEntry.children[1].click()`), nach `clearActionError('automatic')` und nach beiden Neuinitialisierungen, auch bei einem vorbelegten Container mit tabindex 0. Mit Einträgen wird `tabindex` '0' geprüft (Erster Fehler, Fehlerersatz, nach Neuinitialisierung). Ein HTML-Regex-Test prüft den statischen Tag. Abdeckung durch tests/browser-smoke.test.mjs: `assertEmptyTabOrder` fokussiert `#openDiagnosisBtn`, drückt Tab und prüft, dass der Fokus weder auf dem Container noch auf dem Diagnoseknopf liegt. Als Positivkontrolle zeigt der befüllte Fall, dass Tab vom Diagnoseknopf genau auf die Liste mit `tabIndex === 0` führt. Damit ist belegt, dass der Diagnoseknopf in der Tab-Reihenfolge direkt vor dem Container liegt. Laut Attestation ist `npm test` grün.
<!-- audit:findings:end -->

## Validierung

<!-- audit:validation:begin -->
- Runde 1: `npm test` · grün · Exitcode 0.

- Runde 2: `npm test` · grün · Exitcode 0.
<!-- audit:validation:end -->

## Abschlussprüfung

<!-- audit:approval:begin -->
Geprüft:
> Korrektheit des Tab-Zustands über Hinzufügen, Ersetzen, Schließen, automatisches Bereinigen und Neuinitialisierung. ARIA-Beschriftung nur im befüllten Zustand. Fokusübergabe beim Schließen ohne Fokusverlust auf `BODY`. Veraltete Knöpfe bleiben wirkungslos. Schließen löst keine Berechnung und keinen Speicherzugriff aus (balance-smoke). Pfadgrenze: Alle geänderten Pfade liegen in der Correction-Allowlist. Validierungs-Attestation PASS für den Fingerprint [Hash ausgelassen]….

Größtes Restrisiko:
> Der Browser-Smoke mit der echten Tab-Reihenfolge, dem errechneten Kontrast und dem 375-px-Layout läuft in der Orchestrator-Validierung nicht mit. Er wird laut Projektregel erst vor dem Merge extern ausgeführt. Die Tab-Prüfung ist also implementiert, aber im vorliegenden Snapshot nicht ausgeführt.

Bruchbedingung:
> Die Freigabe wäre falsch, wenn eine Ersetzung im selben Bereich den alten Eintrag nach dem Sync-Aufruf entfernt und dadurch eine leere Liste mit `tabindex` '0' zurückbleibt. Dasselbe gilt, wenn `clearActionError` nach einer Neuinitialisierung einen anderen Container synchronisiert als den, aus dem der Eintrag entfernt wurde. Die Mocktests mit Ersatz und Neuinitialisierung decken die bekannten Pfade ab.

Vorab-Risikoanalyse:
> Mögliches Scheitern nach der Freigabe: Im echten Browser liegt zwischen `#openDiagnosisBtn` und dem Container ein weiteres fokussierbares Element. Dann schlägt die Positivkontrolle im Browser-Smoke vor dem Merge fehl und nicht die Produktlogik; das würde sichtbar und nicht still auftreten. Zweites Risiko: Ein Mausklick in die leere Liste kann den Container programmatisch fokussieren, weil `tabindex="-1"` gesetzt ist. Bei Höhe 0 ist das praktisch ausgeschlossen, und R-01 erlaubt `tabindex="-1"` ausdrücklich.
<!-- audit:approval:end -->

<!-- audit:reference:begin -->
Technischer Bezug: Lauf `watch-20261003-135954.330992Z-fd7253ade355`, Arbeitseinheit(en) 5; Nachweise in der Recordkette.
<!-- audit:reference:end -->
