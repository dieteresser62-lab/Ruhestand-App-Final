# Slice 2 von 5 – Auswertung mit zwei Abschnitten und frischer lesender Darstellung integrieren

<!-- audit:status:begin -->
Freigegeben in Runde 1 · 0 Befunde, 0 geschlossen · Validierung grün
<!-- audit:status:end -->

## Ziel

<!-- audit:goal:begin -->
Den vierten Tab umbenennen, die Jahresübersicht barrierefrei darstellen und beide Abschnitte nur im aktiven Tab zeichnen.
<!-- audit:goal:end -->

## Akzeptanzkriterien

<!-- audit:acceptance:begin -->
- SOURCE: Markup und Binderprüfungen zeigen vier Tabs in bestehender Reihenfolge, „Auswertung“ an vierter Stelle, beide benannten Abschnitte untereinander und genau eine Capturetaste. Start, Reload und Profilwechsel starten weiter mit „Jahres-Update“.
- SOURCE: Gefüllter Store erzeugt vor erster Aktivierung sowie nach Verlassen keinerlei dynamisches SVG/Tabelle in beiden Auswertungsabschnitten. Renderinstrumentierung prüft null Markuperzeugung inaktiv. Öffnen zeichnet die aktuelle Datenbasis ohne Erfassung, Engineupdate, Fehlerbereinigung oder Write.
- SOURCE: Tabelle und SVG stimmen für alle Jahre mit Slice-1-Werten überein; laufendes Teiljahr wird textlich markiert. Kein Budget/keine Abweichung, aber sichtbare Budgeterklärung und Ø-Vergleichshinweis. Nullimportjahr und vollständig leere Übersicht bleiben verständlich.
- SOURCE: Neuer Änderungsrückruf nach realem CSV-Import beziehungsweise Jahreswechsel aktualisiert eine aktive Auswertung ohne Tabwechsel; inaktiv bleiben ihre dynamischen Container leer. Löschung/Recovery-Reset hinterlassen keine alten Jahreswerte. Korruptes JSON und fehlerhafte Datenstrukturen erzeugen einen verständlichen Hinweis ohne Rohdaten, Reset oder Seitenabbruch.
- SOURCE: SVG besitzt einen eindeutigen Namen und eine getrennte vollständige Beschreibung; Tabelle ist gleichwertige zugängliche Entsprechung. Alle Scrollregionen sind aktiv per Tastatur erreichbar. Bestehende Vermögenswerte/Markersymbole bleiben; sichtbarer Anlass überall „Unterjährig“, gespeichert weiterhin `manual`.
- SOURCE: Browser-Smoke verlangt eine vollständige gemeinsame Tabzeile ab 1366 und bei 375 CSS-Pixeln bedienbare Tabs, vier interne Diagramm-/Tabellenregionen bei gefüllter Auswertung und keinen seitenweiten Überlauf. Bestehende 720-px-Ausgaben-Check-Tabelle, Drawer und Druckvertrag bleiben geprüft.
- SOURCE: Gezielte Läufe für `balance-expenses-history.test.mjs`, `balance-expenses.test.mjs`, `balance-ui-orchestration.test.mjs` und `balance-wealth-history-chart.test.mjs` mit `node tests/run-single.mjs` bestehen. Der Orchestrator führt `npm test` aus; Browserlauf bleibt dem externen Abschlussgate vorbehalten.
<!-- audit:acceptance:end -->

## Umfang

<!-- audit:scope:begin -->
- `Balance.html`
- `Handbuch.html`
- `README.md`
- `app/balance/balance-binder.js`
- `app/balance/balance-expenses-history-renderer.js`
- `app/balance/balance-expenses.js`
- `app/balance/balance-main.js`
- `app/balance/balance-wealth-history-metrics.js`
- `app/balance/balance-wealth-history-renderer.js`
- `css/balance.css`
- `docs/internal/e-auswertung-ausgaben-implement-review-8b7f18fb.md`
- `docs/internal/slice-e-auswertung-ausgaben-arbeitsplan-02-auswertung-mit-zwei-abschnitten-und-frischer-lesender-darstellung-integr.md`
- `docs/reference/BALANCE_MODULES_README.md`
- `docs/reference/TECHNICAL.md`
- `tests/README.md`
- `tests/balance-expenses-history.test.mjs`
- `tests/balance-expenses.test.mjs`
- `tests/balance-ui-orchestration.test.mjs`
- `tests/balance-wealth-history-chart.test.mjs`
- `tests/browser-smoke.test.mjs`
<!-- audit:scope:end -->

## Umsetzung

> Der vierte Tab heißt „Auswertung“ und enthält die semantisch benannten Abschnitte „Vermögensverlauf“ und darunter „Ausgaben je Jahr“. Die bestehenden Vermögens-IDs und genau eine Capturetaste bleiben erhalten. Der sichtbare Anlass heißt „Unterjährig“ bei unverändert gespeichertem `manual`, Raute und gestricheltem Rahmen.
>
> Der neue `balance-expenses-history-renderer.js` liest `loadExpensesStoreResult()` und verwendet die reine Jahresprojektion aus Slice 1 mit einer injizierbaren lokalen Uhr. SVG und gleichwertige Tabelle zeigen Jahressumme, Monate mit positiven Ausgaben und Ø pro Monat über alle gespeicherten Profile; Nullimportjahre bleiben sichtbar, reine Auswahlcontainer entfallen. Das aktuelle Teiljahr ist textlich markiert. Budgetgrenze und Ø-Vergleich stehen sichtbar im Abschnitt. Eindeutige SVG-Titel-/Beschreibungs-IDs und insgesamt vier benannte Tastaturregionen sichern die zugängliche Darstellung. Fehlerdiagnosen nennen Datenbereich/Backend und Recovery im Ausgaben-Check, ohne Rohdaten oder Reset.
>
> Beide Abschnitte werden bei Tabwechsel, Start/Update, Balance-Import einschließlich Ablehnung/Rollback sowie Snapshotaktionen frisch gelesen. Inaktive Renderer erzeugen kein dynamisches Markup und leeren alte Container. `initExpensesTab(dom, { onChange })` benachrichtigt nach realem Import, Jahresauswahl/Wechsel, tatsächlicher Löschung und bestätigt geflushtem Recovery-Reset. Ein noch offenes Dateilesen mit anschließender Aktivierung prüft die Aktualisierung ohne weiteren Tabwechsel. Die lesende Integration erfasst noch keinen Vermögensstand nach Ausgabenimport.
>
> README, Handbuch, technische Referenz, Modulreferenz und Testdokumentation sind synchronisiert. Browser-Smoke verlangt die gemeinsame Tabzeile ab 1366 CSS-Pixeln und verwendet eine breite Fixture mit 24 Vermögensständen und 24 Ausgabenjahren. Bei 375 CSS-Pixeln müssen alle vier gefüllten Regionen intern scrollen, ohne seitenweiten Überlauf; bestehende 720-px-Ausgaben-Check-Tabelle, Drawer und Druckvertrag bleiben geprüft.
>
> ### Gezielte Validierung des Implementierers
>
> Auf dem aktuellen Produktstand mit `node tests/run-single.mjs` bestanden:
>
> - `tests/balance-expenses-history.test.mjs`: 179 Assertions.
> - `tests/balance-expenses.test.mjs`: 119 Assertions.
> - `tests/balance-ui-orchestration.test.mjs`: 562 Assertions.
> - `tests/balance-wealth-history-chart.test.mjs`: 167 Assertions.
>
> Insgesamt 1.027 Assertions, keine fehlgeschlagenen Assertions oder Dateien. `node --check tests/browser-smoke.test.mjs` und `git diff --check` bestanden. Die volle Suite `npm test` wurde nicht vom Implementierer ausgeführt; sie gehört dem Orchestrator. Der Browserlauf wurde gemäß Auftrag nicht in der Agentensandbox gestartet und bleibt dem externen Abschlussgate vorbehalten. Die beschriebenen Layoutassertions sind noch keine gemessenen Browserergebnisse. Der vorhandene fremde Eintrag `.gemini` und die vom Orchestrator vorbereiteten Auditbereiche bleiben unangetastet.

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
> Geprüft wurden Pfadgrenze, Markup, Renderer, Binder, Main, Ausgaben-Rückruf, Tests, Doku und Attestierung. Pfadgrenze: Alle 18 Diffpfade liegen in der Allowlist von Slice 2. Markup: Balance.html hat vier Tabs, „Auswertung“ steht an vierter Stelle. Die beiden Abschnitte h4 wealthHistoryTitle und expensesHistoryTitle stehen untereinander. captureWealthBtn gibt es genau einmal. Es gibt vier Regionen mit tabindex=0, role=region und aria-label. Renderer balance-expenses-history-renderer.js: Er leert chart, table und hint immer und zeichnet nur bei panel.classList.contains('active'). validateContainers prüft years, months, profiles und categories lesend. Ausnahmen und Fehler führen zu einem festen Diagnosetext ohne Rohdaten und ohne Write. Eine nicht endliche Summe wird abgewiesen. Das SVG hat eigene IDs expensesChartTitle und expensesChartDesc. yearLabel und Euro-Werte werden escaped. Binder: handleTabClick, der Import-finally und handleSnapshotActions-finally aktualisieren beide Abschnitte. Main: init, update und initExpensesTab übergeben onChange. balance-expenses.js: notifyExpensesChange kapselt Rückruffehler. Der Rückruf läuft nur nach saveExpensesStore bei Import und tatsächlicher Löschung, in setYear und nach bestätigtem Reset. Tests: balance-expenses-history.test.mjs prüft mit dem innerHTML-Setter null Markup im inaktiven Zustand. Je Jahr gleicht er Tabelle und SVG mit prepareExpensesHistoryMetrics ab und prüft Teiljahr, keine Budgetspalten, Korruptions- und Leerfälle, writes===0 und endliche Koordinaten. balance-expenses.test.mjs zeigt: offenes Dateilesen löst noch keinen Rückruf aus, danach genau einen. Zusätzlich geprüft werden Löschung, No-op, Jahreswechsel, Jahresauswahl inaktiv und Reset nur nach Flush. balance-ui-orchestration.test.mjs prüft den echten Tablistener mit generated===4 sowie leere Container beim Verlassen und updates+writes+clears===0. balance-wealth-history-chart.test.mjs prüft die Tabreihenfolge, die Regionen und label „Unterjährig“ bei reason „manual“. Die Doku ist in README, Handbuch, TECHNICAL, BALANCE_MODULES_README und tests/README konsistent auf 1366 px und „Auswertung“ umgestellt. Die Attestierung npm test ist PASS auf Fingerprint [Hash ausgelassen]….

Größtes Restrisiko:
> Größtes Restrisiko: Vorzeichen und Typ der Slice-1-Projektion lassen sich in diesem Paket nicht prüfen. balance-expenses-metrics.js liegt weder im Diff noch im Paket. Daher ist nicht entscheidbar, ob annualUsed bei Nettoerstattungen negativ werden kann. Dann entstünde ein rect mit negativer Höhe. Ebenso offen ist, ob row.year stets numerisch ist; es wird im SVG-<text> unescaped eingesetzt. Die Tests decken nur nichtnegative Summen und numerische Jahresschlüssel ab. Zweites Restrisiko: Die einzeilige Tabzeile ab 1366 px und die vier scrollenden Regionen bei 375 px sind nur im externen Browsergate belegt. Dieses Gate läuft vertragsgemäß nicht in npm test.

Bruchbedingung:
> Die Freigabe ist falsch, wenn eine der folgenden Bedingungen eintritt: prepareExpensesHistoryMetrics liefert negative annualUsed oder nicht numerische year-Werte. Nach Import, Löschung, Jahreswechsel oder Reset bleibt die aktive Übersicht veraltet. Eine inaktive Aktualisierung erzeugt SVG oder Tabellenmarkup. Die Darstellung schreibt in den Ausgabenstore. Der Browserlauf zeigt bei 1366 px mehr als eine Tabzeile.

Vorab-Risikoanalyse:
> Angenommen, dieser Slice scheitert später. Die wahrscheinlichsten Ursachen: (1) Ein Jahr mit Nettoerstattung erzeugt eine negative Säulenhöhe und damit ein ungültiges SVG; das hängt von der Slice-1-Projektion ab. (2) validateContainers ist strenger als der Ausgaben-Check selbst. Dann melden ältere, im Ausgaben-Check gültige Profileinträge ohne categories hier eine Beschädigung. (3) Ein weiterer, im Diff nicht sichtbarer Aufruf von initExpensesTab ohne onChange setzt den Rückruf auf null. Dann aktualisiert sich die aktive Auswertung nach Import nicht mehr. (4) Andere Schriftmetriken brechen die Tabzeile bei 1366 px um; das deckt nur das externe Browsergate auf. Keiner dieser Punkte ist im vorliegenden Diff als Defekt belegt. Alle Abnahmekriterien von Slice 2 sind durch die genannten Assertions und die grüne npm-test-Attestierung abgedeckt.
<!-- audit:approval:end -->

<!-- audit:reference:begin -->
Technischer Bezug: Lauf `watch-20261003-162826.876868Z-73b99f8bd2c7`, Arbeitseinheit(en) 3; Nachweise in der Recordkette.
<!-- audit:reference:end -->
