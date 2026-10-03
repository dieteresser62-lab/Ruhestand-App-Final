# Slice 1 von 3 – Eigenständige Kurzmeldungen mit sicherer Laufzeit

<!-- audit:status:begin -->
Freigegeben in Runde 1 · 0 Befunde, 0 geschlossen · Validierung grün
<!-- audit:status:end -->

## Ziel

<!-- audit:goal:begin -->
Toasts vom bisherigen Fehlerkanal trennen und ihren Lebenszyklus gegen Hintergrundupdates und veraltete Timer absichern.
<!-- audit:goal:end -->

## Akzeptanzkriterien

<!-- audit:acceptance:begin -->
- An der Quelloberfläche von Balance existiert ein benachbarter, zugänglicher Statusbereich mit `role="status"` und `aria-live="polite"`; beide Toasttypen sind zusätzlich zu Farbe durch Form und zugängliche Typkennzeichnung unterscheidbar, der Meldungswortlaut bleibt exakt erhalten.
- Kontrollierte Node-Zeit belegt Sichtbarkeit bis unmittelbar vor 6000 ms und Entfernung bei Ablauf. Neuer Toast, identischer Folgetext und erneute Initialisierung sind abgesichert; ein ausdrücklich ausgeführter alter Callback kann eine neuere Meldung nicht löschen.
- Node-Tests über den echten Renderer sowie das echte `balanceMain.update()` belegen, dass ein Toast `clearError()` und erfolgreiche oder fehlerhafte Updates überlebt; Fehler können gleichzeitig im bisherigen Fehlerkanal erscheinen.
- Der Browser-Smoke beobachtet Fehler und Toasts zusätzlich im Meldungsprotokoll. Der erfolgreiche neue Jahresabschluss wird im sichtbaren Toasttext nach 1 s und 3 s mit dem unveränderten Zusatz belegt; No-op und Jahre vor 2026 erhalten weiterhin keinen neuen Zusatz. Markt-CSV-Erfolg wird am neuen Kanal geprüft.
- Die neue Testdatei wird von der bestehenden Suite entdeckt und isoliert ausgeführt; gezielte Tests liefern gezählte Assertions und keine zurückbleibenden Echtzeittimer. `npm test` ist auf diesem Slice-Stand beim Orchestrator grün.
<!-- audit:acceptance:end -->

## Umfang

<!-- audit:scope:begin -->
- `Balance.html`
- `app/balance/balance-main.js`
- `app/balance/balance-renderer.js`
- `css/balance.css`
- `docs/internal/f-meldungen-sichtbar-implement-review-5ff9eb73.md`
- `docs/internal/slice-f-meldungen-sichtbar-arbeitsplan-01-eigenstandige-kurzmeldungen-mit-sicherer-laufzeit.md`
- `tests/balance-messages.test.mjs`
- `tests/balance-smoke.test.mjs`
- `tests/browser-smoke.test.mjs`
- `tests/run-tests.mjs`
<!-- audit:scope:end -->

## Umsetzung

> - Eigenständiger `#toast-container` neben dem bisherigen Fehlerkanal, mit `role="status"`, `aria-live="polite"` und `aria-atomic="true"`; `balance-main.js` bindet ihn als `dom.containers.toast`.
> - Der echte Renderer ersetzt Toasts mit unverändertem Meldungstext als Textknoten, separater zugänglicher Typkennzeichnung und dekorativem Symbol. Erfolgs- und Fehlertyp haben unterschiedliche Symbol-/Rahmenformen zusätzlich zur Farbe. Lange Texte umbrechen; Toasts werden beim Drucken ausgeblendet.
> - Eine Meldung hat 6000 ms Laufzeit. Neuer Aufruf storniert den Vorgängertimer; die zusätzliche Identitäts- und Containerprüfung schützt gegen ausdrücklich ausgeführte veraltete Callbacks, auch bei identischem Folgetext. Neuinitialisierung entfernt alte Toasts und Timer.
> - `handleError()` und `clearError()` behalten den bestehenden Berechnungsfehlervertrag. Toasts überleben echte erfolgreiche, validierungsfehlerhafte, enginefehlerhafte und verzögerte Updates.
> - `balance-messages.test.mjs` verwendet kontrollierte Zeit, gezählte Runner-Assertions und Cleanup für Rendererzustand sowie DOM-/Timer-Globals; die bestehende Suite entdeckt und isoliert die Datei. Der App-Smoke beendet seinen echten Toasttimer im `finally` und restauriert seine Globals.
> - Das Browserprotokoll beobachtet beide Kanäle und liest bei Toasts ausschließlich `.toast-text`. Der Markt-CSV-Erfolg verlangt sichtbaren Text sowie einen seit der Aktion neuen wortgleichen Protokolleintrag. Der Jahresabschluss prüft aktuelle Sichtbarkeit und exakten Wortlaut nach ungefähr 1 s und insgesamt 3 s bei offenem und geschlossenem Verlauf; zusätzlich ist der erfolgreiche Abschluss für 2025 ohne Vermögenszusatz abgesichert. Die bestehenden No-op-Prüfungen bleiben erhalten.

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
> Geprüft wurden Korrektheit, Vertrag, Fehlerpfade, Sicherheit, Barrierefreiheit, Testabdeckung und Umfang. Pfadgrenze: Alle 8 Diff-Pfade liegen in der Slice-Allowlist. Das Slice-MD und der Prüfbericht gehören dem Orchestrator. Kriterium 1: Balance.html enthält direkt nach #error-container den neuen #toast-container mit role="status", aria-live="polite" und aria-atomic="true"; tests/balance-messages.test.mjs prüft das per Regex. Erfolg und Fehler unterscheiden sich durch das Symbol ✓/!, rundes bzw. eckiges Icon, durchgezogenen bzw. gestrichelten Rahmen (css/balance.css) und einen visuell verborgenen Typtext 'Erfolg: '/'Fehler: ', den der Test über toast-type sowie toastText === literal mit 0 Kindknoten belegt. Ausgegeben wird nur über textContent, nicht über innerHTML. Kriterium 2: Die Fake-Uhr belegt, dass der Toast bei 5999 ms noch sichtbar und bei 6000 ms entfernt ist. Abgedeckt sind auch der Abbruch des alten Timers, ein identischer Folgetext, eine Neuinitialisierung mit neuem und mit demselben Container sowie explizit ausgeführte alte Callbacks über die Prüfung von Revision und Container. Kriterium 3: tests/balance-smoke.test.mjs prüft visibleToastText() === notification nach clearError, debouncedUpdate, erfolgreichem update, Validierungsablehnung und Enginefehler. Beim Enginefehler wird zusätzlich der Fehlerkanal geprüft. Kriterium 4: Der MutationObserver erfasst beide Kanäle. Der Toast wird nach 1 s und 3 s auf wortgleichen Text geprüft, der Fall vor 2026 ist ergänzt, und der CSV-Erfolg wird am #toast-container geprüft. Kriterium 5: Die Testdatei wird in TEST_EXECUTION_POLICY isoliert ausgeführt; Runner-Erkennung und Isolation werden geprüft. Die Fake-Uhr endet mit 0 offenen Timern, und balance-smoke beendet den echten Timer im finally-Block über initUIRenderer(null, null). Die Attestierung für npm test lautet PASS mit passendem Fingerprint. Die Print-Regel :not(:empty) ist wegen ihrer höheren Spezifität nötig und kein Duplikat.

Größtes Restrisiko:
> Der Browser-Smoke läuft nicht im Orchestrator. Nicht prüfbar ist, ob die Fixture-Optionen des neuen Szenarios vor 2026 (annualFixtures.targetYear, fixedTime, createBalanceStorage(2025)) tatsächlich 'calendar-year:2025' und den Text 'Ausgaben-Check auf 2026 umgestellt.' erzeugen. Grund: Das Paket enthält nur Diff-Hunks und nicht die Helfer openSmokePage, createBalanceStorage oder readBalanceBrowserState. Das klärt erst der Browserlauf vor dem Merge. Unbestätigt bleibt außerdem, dass zwischen Commit und der Messung nach 3 s kein weiterer Toast die Bestätigung ersetzt.

Bruchbedingung:
> Die Freigabe ist falsch, wenn eine der folgenden Bedingungen eintritt: (1) Der Browser-Smoke scheitert im Szenario vor 2026 oder bei der Toastprüfung nach 1 s bzw. 3 s. (2) Ein bestehender Aufrufer erwartet Toasttexte weiterhin in #error-container; das ist laut Plan Gegenstand von Slice 2. (3) balance-renderer.js und balance-main.js laufen in balance-smoke als getrennte Modulinstanzen. Das widerlegen die grünen Toast-Assertions dort.

Vorab-Risikoanalyse:
> Wahrscheinlichste Ursache eines späteren Fehlschlags: Der nur manuell gefahrene Browser-Smoke schlägt im neuen Szenario vor 2026 fehl, weil die Fixture-Optionen nicht wie angenommen wirken, oder ein nachfolgender Toast überschreibt die Abschlussbestätigung vor der 3-s-Messung. Beides fiele erst in der gesteuerten Sitzung vor dem Merge auf, nicht in npm test. Die Node-Abdeckung für Lebenszyklus, Identität und Unabhängigkeit vom Fehlerkanal ist dagegen durch echte Assertions belegt.
<!-- audit:approval:end -->

<!-- audit:reference:begin -->
Technischer Bezug: Lauf `watch-20261003-123059.059014Z-4fdb3042188a`, Arbeitseinheit(en) 2; Nachweise in der Recordkette.
<!-- audit:reference:end -->
