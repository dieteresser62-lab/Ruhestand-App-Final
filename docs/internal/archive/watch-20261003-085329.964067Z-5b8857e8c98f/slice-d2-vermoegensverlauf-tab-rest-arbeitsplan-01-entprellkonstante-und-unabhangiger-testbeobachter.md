# Slice 1 von 3 – Entprellkonstante und unabhängiger Testbeobachter

<!-- audit:status:begin -->
Freigegeben in Runde 1 · 0 Befunde, 0 geschlossen · Validierung grün
<!-- audit:status:end -->

## Ziel

<!-- audit:goal:begin -->
Den Timer-Beobachter von der Browser-Suite entkoppeln, seine Verzögerung mit dem Produkt teilen und den Accessor-Pfad sowie fremde Speicherzugriffe beim Tabwechsel absichern.
<!-- audit:goal:end -->

## Akzeptanzkriterien

<!-- audit:acceptance:begin -->
1. Gemessen an SOURCE: Produkt und Browser-Beobachter beziehen ihre Entprellzeit aus `BALANCE_UPDATE_DEBOUNCE_MS`; die serialisierte Init-Funktion ist ohne freie Modulvariablen ausführbar. Die Produktverzögerung beträgt weiterhin 250 ms.
2. Gemessen an SOURCE: `tests/balance-wealth-history.test.mjs` importiert den Beobachter nur aus dem Hilfsmodul. VM-Prüfungen belegen Start/Reload, Idempotenz, nachträgliche Timerzuweisung, Beobachtung eines 250-ms-Timers, Callbackargumente, Folgeupdates, Cancel und Cleanup nach Callbackfehler. Ein Test mit anderer übergebener Verzögerung belegt die Parameterbindung; ein 3500-ms-Meldungstimer blockiert Idle nicht.
3. Gemessen an SOURCE: Der Browserfall vergleicht bei Tabwechseln Schlüssel und Werte von `localStorage` und `sessionStorage` und verlangt null Mutationen beider Speicher zusätzlich zu den bisherigen Nullzählern und State-/Registry-/Exportvergleichen; jede Instrumentierung wird zurückgebaut.
4. Gemessen an SOURCE: Node-Tests belegen, dass Tabwechsel kein Update und keine Entprellplanung auslösen. Neue Browserprüfungen warten auf beobachtbares Idle; sie führen keine festen Aktionswartezeiten ein. Der Profilverbund-Startuphelfer wird nur für Szenarien mit zwei Profilen eingesetzt.
5. Gemessen an SOURCE: Die fokussierten Node-Prüfungen bestehen; die betroffenen Referenzen beschreiben Hilfsmodul, gemeinsame Konstante, `page.clock`-Accessor und die Browserprüfung durch die gesteuerte Sitzung vor dem Merge.
<!-- audit:acceptance:end -->

## Umfang

<!-- audit:scope:begin -->
- `app/balance/balance-config.js`
- `app/balance/balance-main.js`
- `docs/internal/d2-vermoegensverlauf-tab-rest-implement-review-e2196f18.md`
- `docs/internal/slice-d2-vermoegensverlauf-tab-rest-arbeitsplan-01-entprellkonstante-und-unabhangiger-testbeobachter.md`
- `docs/reference/BALANCE_MODULES_README.md`
- `docs/reference/TECHNICAL.md`
- `tests/README.md`
- `tests/balance-wealth-history.test.mjs`
- `tests/browser-smoke.test.mjs`
- `tests/wealth-browser-update-observer.mjs`
<!-- audit:scope:end -->

## Umsetzung

> - `balance-config.js` exportiert `BALANCE_UPDATE_DEBOUNCE_MS = 250`; `debouncedUpdate()` verwendet die Konstante ohne Verhaltensänderung.
> - `tests/wealth-browser-update-observer.mjs` enthält den unabhängig importierbaren Beobachter. Die Browser-Suite und der Node-Test übergeben die gemeinsame Entprellzeit ausdrücklich; der serialisierte Init-Hook benötigt keine freien Modulvariablen.
> - Die VM-Matrix prüft frische Start-/Reload-Kontexte mit ursprünglichen und nach Installation neu zugewiesenen Timerfunktionen, jeweils mit 250 ms und abweichenden 417 ms. Idempotenz beider Hooks, Scheduler-/Cancelweiterleitung, Callbackargumente, Folgeupdates, Cleanup nach Callbackfehler und nicht blockierende 3500-ms-Meldungstimer sind abgesichert.
> - Die Browser-Tabprüfung vergleicht sortierte Schlüssel und sämtliche Schlüssel/Wert-Paare von `localStorage` und `sessionStorage`. Pro Speicher werden `setItem`, `removeItem` und `clear` instrumentiert und mit Sollwert null geprüft. Bestehende Update-/Fehlerbereinigungs-/Fassadewrite-Zähler sowie State-/Registry-/Exportvergleiche bleiben erhalten. Das `finally` restauriert die ursprünglichen Methodendeskriptoren und entfernt die Hilfsvariablen, auch bei fehlgeschlagener Aktion oder Teilinstallation.
> - Die Node-Tabprüfung prüft Eintritt und Austritt über alle anderen Haupttabs mit null synchronen Updates, Entprellplanungen, Erfassungen, Fehlerbereinigungen und State-/Registrywrites pro Aktion. Neue feste Aktionswartezeiten wurden nicht eingeführt; der Profilverbund-Startuphelfer bleibt auf das vorhandene Zwei-Profil-Szenario beschränkt.
> - Die drei betroffenen Referenzen beschreiben Hilfsmodul, gemeinsame Konstante, `page.clock`-Accessors und die Zuständigkeit der gesteuerten Sitzung für das Browsergate vor dem Merge.

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
> Korrektheit: `debouncedUpdate()` in app/balance/balance-main.js nutzt `BALANCE_UPDATE_DEBOUNCE_MS` (=250) aus app/balance/balance-config.js. tests/wealth-browser-update-observer.mjs bekommt `debounceMs` als Parameter und hat keine freien Modulvariablen. browser-smoke übergibt den Wert per `context.addInitScript(installWealthBrowserUpdateObserver, BALANCE_UPDATE_DEBOUNCE_MS)`. Abdeckung in tests/balance-wealth-history.test.mjs: `assertEqual(BALANCE_UPDATE_DEBOUNCE_MS, 250, ...)`, eine Schleife über Start/Reload × {250, 417} × {ursprüngliche, nachträglich zugewiesene Timer}, Idempotenz beider Hooks (`window.setTimeout`/`window.clearTimeout` bleiben gleich), Zähler für Planung und Abbruch, Callbackargumente, Folgeupdate, 3500-ms-Timer, Fehlerpfad und bei 417 ms die Prüfung „nur die übergebene Verzögerung wird beobachtet“. Der Import erfolgt nur noch aus dem Hilfsmodul. Tabwechsel-Node-Test: Für jeden Index wird `previews`=0, `debounceResumed`=0, `clears`=0 sowie unveränderter State und unveränderte Registry geprüft. Browserfall: Schlüssel und Werte von local- und sessionStorage werden vorher und nachher verglichen. Mutationszähler hängen an `Storage.prototype`. Rückbau über Deskriptoren in umgekehrter Reihenfolge, im finally mit `?.()`. Es gibt keine neuen festen Wartezeiten. Dokumentation: Die drei Referenzen beschreiben Hilfsmodul, Konstante, `page.clock`-Accessor und das Browsergate der gesteuerten Sitzung vor dem Merge, passend zu AGENTS.md. Umfang: Alle Diffpfade sind in der Allowlist. `npm test` ist für den passenden Fingerprint PASS.

Größtes Restrisiko:
> Die Vorgabe, den Profilverbund-Startuphelfer nur für Zwei-Profil-Szenarien einzusetzen, kann ich nicht prüfen. Das Paket enthält nur den Diff, nicht die vollständige tests/browser-smoke.test.mjs. Die Aufrufstellen von `waitForWealthBrowserStartup` liegen außerhalb der Hunks. Ebenso stehen die Definitionen von `previews`/`debounceResumed` im Node-Test nicht im Diff. Dass sie existieren, folgt aus dem grünen `npm test`; ihre genaue Semantik sehe ich nicht. Das Browsergate selbst wurde nicht ausgeführt, es fährt laut Vertrag die gesteuerte Sitzung vor dem Merge.

Bruchbedingung:
> Diese Freigabe wäre falsch, wenn eine der folgenden Bedingungen zutrifft: (a) der Ein-Profil-Jahresabschluss in browser-smoke ruft weiterhin `waitForWealthBrowserStartup` auf; (b) `debounceResumed` zählt keine echten Entprellplanungen aus `debouncedUpdate()`; (c) der Tabwechsel im Browser verändert legitimerweise local- oder sessionStorage, sodass das Browsergate vor dem Merge rot wird.

Vorab-Risikoanalyse:
> Das wahrscheinlichste Scheitern ist ein rotes Browsergate in der gesteuerten Sitzung. Mögliche Ursache: Fremdcode (z. B. Tauri-, Profil- oder Navigationslogik) schreibt beim Tabwechsel über `Storage.prototype` in sessionStorage, und die neue Nullzählung schlägt fehl. Das wäre dann ein echter Befund im Produkt, kein Testfehler. Ein zweites Risiko: Eine künftige Änderung der Produktverzögerung bleibt durch die gemeinsame Konstante abgedeckt. Andere 250-ms-Timer der App würden aber weiterhin mitbeobachtet und könnten Idle verzögern. Das verlängert höchstens die Wartezeit und führt nicht zu falsch-grünen Ergebnissen.
<!-- audit:approval:end -->

<!-- audit:reference:begin -->
Technischer Bezug: Lauf `watch-20261003-085329.964067Z-5b8857e8c98f`, Arbeitseinheit(en) 2; Nachweise in der Recordkette.
<!-- audit:reference:end -->
