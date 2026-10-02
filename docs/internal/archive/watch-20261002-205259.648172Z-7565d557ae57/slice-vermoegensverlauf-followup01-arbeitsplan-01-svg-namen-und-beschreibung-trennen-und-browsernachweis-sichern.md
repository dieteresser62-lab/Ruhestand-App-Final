# Slice 1 von 1 – SVG-Namen und Beschreibung trennen und Browsernachweis sichern

<!-- audit:status:begin -->
Freigegeben in Runde 1 · 0 Befunde, 0 geschlossen · Validierung grün
<!-- audit:status:end -->

## Ziel

<!-- audit:goal:begin -->
Die fehlerhafte ARIA-Zuordnung korrigieren, ihre Wiederkehr mit Unit- und Browserprüfungen verhindern und die zuvor abgebrochenen Durchstiche vollständig nachweisen.
<!-- audit:goal:end -->

## Akzeptanzkriterien

<!-- audit:acceptance:begin -->
- SOURCE: Jedes gerenderte Verlaufs-SVG hat `role="img"`, `aria-labelledby="wealthChartTitle"` und `aria-describedby="wealthChartDesc"`. Der Name ist exakt „Vermögensverlauf in nominalen Euro“; die vollständige vorhandene Langbeschreibung ist als Beschreibung erreichbar.
- SOURCE: `tests/balance-wealth-history-chart.test.mjs` enthält Assertions auf den vollständigen Wert `wealthChartTitle` des Namensattributs und die separate Beschreibungsreferenz am erzeugten SVG. Die ursprüngliche Zuordnung beider IDs zum Namen würde diese Assertions verletzen. Das Prüfprotokoll enthält den tatsächlichen gezielten Unit-Lauf mit Datum, Stand, Befehl, Exitcode 0 und Ergebnis.
- SOURCE: `assertWealthBrowserTable()` behält die exakte Rollen-/Namenssuche und genau einen Treffer bei und prüft zusätzlich die separate Beschreibungszuordnung und den vollständigen Beschreibungstext. Die vorhandenen Folgeassertions für Tagesersetzung, Reload, Profilwechsel und Profilisolation, 375px-Ansicht, Nullstand und Legacy-Import sowie Jahresstand, Wiederholung und Reload bleiben im Testquelltext erhalten.
- SOURCE: Das Prüfprotokoll enthält für beide vom Implementierer selbst versuchten `--only`-Läufe je Datum, Rolle, Ausführungsumgebung, geprüften Stand, exakten Befehl, tatsächlichen Exitcode und Abschlussmeldung oder konkrete Fehlermeldung. Ein Sandboxfehler wird als solcher ausgewiesen und nicht als bestandener Browserfall verbucht.
- SOURCE: Das Prüfprotokoll enthält zusätzlich zwei vom Operator eingetragene externe Erfolgsnachweise, jeweils mit Datum, Rolle, Ausführungsumgebung außerhalb der Agentensandbox, geprüftem Stand, exaktem Befehl, Exitcode 0 und der jeweiligen Abschlussmeldung `Browser smoke passed: Balance wealth history` beziehungsweise `Browser smoke passed: Balance annual commit`. Die darin angegebenen SHA-256-Werte der drei Quell-/Testdateien stimmen mit dem zu prüfenden Repositorystand überein. Fehlende oder abweichende Einträge erfüllen dieses Kriterium nicht; ein grünes `npm test` ersetzt sie nicht.
<!-- audit:acceptance:end -->

## Umfang

<!-- audit:scope:begin -->
- `app/balance/balance-wealth-history-renderer.js`
- `docs/internal/slice-vermoegensverlauf-followup01-arbeitsplan-01-svg-namen-und-beschreibung-trennen-und-browsernachweis-sichern.md`
- `docs/internal/vermoegensverlauf-followup01-arbeitsplan.md`
- `docs/internal/vermoegensverlauf-followup01-implement-review-65188890.md`
- `tests/balance-wealth-history-chart.test.mjs`
- `tests/browser-smoke.test.mjs`
<!-- audit:scope:end -->

## Umsetzung

> Das Verlaufs-SVG referenziert für den zugänglichen Namen ausschließlich `wealthChartTitle` und für die Beschreibung separat `wealthChartDesc`. Titel und vollständiger Beschreibungstext bleiben erhalten.
>
> Der Unit-Test prüft die exakten ARIA-Werte am öffnenden SVG-Tag, genau ein referenziertes Titel-/Beschreibungselement und beide vollständigen Texte. Diese Prüfungen laufen auch für Einzelstand, Nullstand und sehr große endliche Werte. Der Browserhelfer behält die exakte Rollen-/Namenssuche und genau einen Treffer bei und prüft zusätzlich beide ARIA-Werte sowie das eindeutige Beschreibungselement mit vollständigem Text. Alle bestehenden Folgeassertions bleiben erhalten.
>
> Der gezielte Unit-Lauf am 2026-10-02 besteht mit Exitcode 0 und 77/77 Assertions. Beide geforderten eigenen Browserläufe wurden versucht und scheiterten mit Exitcode 1 an `Error: listen EPERM: operation not permitted 127.0.0.1`. Datum, Rolle, Umgebung, HEAD, Dateihashes, Befehle und tatsächliche Ergebnisse stehen im Prüfprotokoll von `docs/internal/vermoegensverlauf-followup01-arbeitsplan.md`. Die volle Standardsuite bleibt dem Orchestrator vorbehalten.
>
> Die zwei externen Operator-Erfolgsnachweise fehlen. Der Slice ist mit `OPERATOR-PREREQUISITE-MISSING` angehalten und nicht abgeschlossen; die externen Läufe müssen auf dem unveränderten korrigierten Stand dokumentiert und bei Wiederaufnahme gegen die drei Dateihashes geprüft werden.
>
> Wiederaufnahme am 2026-10-02: Beide externen Operator-Läufe sind inzwischen als Fehlerläufe dokumentiert; ihre drei Dateihashes stimmen mit dem unveränderten Quell-/Teststand überein. Der 375px-Fall scheitert am zusätzlichen Seitenüberlauf, der Jahresabschlussfall an der unsichtbaren Jahresauswahl im inaktiven Ausgaben-Tab. Die Layoutkorrektur benötigt `css/balance.css` außerhalb des freigegebenen Umfangs. Aktueller Halt ist deshalb `SCOPE-EXTENSION-REQUESTED`; die Diagnose und die erforderliche Testnavigation stehen im Arbeitsplan. Keine weitere Produkt-/Teständerung und keine neuen Testläufe bei dieser Wiederaufnahme; die beiden externen Erfolgsnachweise bleiben offen.
>
> Aktueller Umsetzungsstand nach freigegebener Umfangserweiterung und Wiederaufnahme am `2026-10-02T23:07:25+02:00`: Die responsive Ergebnisspalte erhält bis 1250px `align-self: stretch`; im Jahresabschlussfall sind die erforderlichen Tabwechsel ergänzt. Sämtliche bestehenden Folgeassertions sind erhalten. Beide zweiten externen Operator-Läufe bestehen mit Exitcode 0 und den jeweiligen Abschlussmeldungen. Die drei Quell-/Testdateihashes und der zusätzliche CSS-Hash wurden nachgerechnet und stimmen mit beiden Erfolgsnachweisen überein. Die vollständige Evidenz und der Hashabgleich stehen im Arbeitsplan.
>
> Der Voraussetzungshalt ist aufgehoben. Alle SOURCE-Akzeptanzkriterien sind erfüllt; der Slice ist zur Orchestrator-Validierung und unabhängigen Prüfung bereit. Der gültige gezielte Unit-Lauf auf unverändertem Stand besteht mit 77/77 Assertions. Beide eigenen Sandbox-Portfehler bleiben als Fehler dokumentiert. Keine neuen Produkt-/Teständerungen oder erneuten Testläufe bei dieser Wiederaufnahme; die volle Standardsuite bleibt dem Orchestrator vorbehalten.

## Abweichungen vom Plan

> Keine.

## Verlauf

<!-- audit:history:begin -->
- Runde 1: Umsetzung · Validierung grün · Prüfurteil freigegeben · 0 neu, 0 geschlossen.
- Runde 1: Halt (Stoppanforderung). Grund: ARIA-Zuordnung korrigiert und Regressionstests ergänzt. Gezielter Unit-Test: 77/77 Assertions, Exitcode 0. Beide Browserversuche und Dateihashes sind im Prüfprotokoll dokumentiert. Missing prerequisite: Zwei erfolgreiche externe Operator-Browsernachweise für „Balance wealth history“ und „Balance annual commit“ auf dem korrigierten Stand fehlen. Why it cannot be self-provided: Beide eigenen Läufe scheiterten in der Agentensandbox mit Exitcode 1 an „Error: listen EPERM: operation not permitted 127.0.0.1“. Der Implementierer kann außerhalb seiner Sandbox keine Läufe durchführen. Operator action: Beide dokumentierten --only-Befehle außerhalb der Agentensandbox auf dem unveränderten korrigierten Stand ausführen; jeweils Datum, Rolle, Umgebung, HEAD, drei Dateihashes, Befehl, Exitcode 0 und Erfolgsabschlussmeldung im Arbeitsplan eintragen und den Slice fortsetzen lassen.
- Runde 1: Umfang erweitert um css/balance.css. Grund: Required paths: css/balance.css Why required for current Slice: Der externe 375px-Browserlauf scheitert am zusätzlichen Seitenüberlauf. Die responsive Breitenbegrenzung der Ergebnisspalte muss im bestehenden CSS-Layout korrigiert werden; css/balance.css liegt außerhalb des freigegebenen Umfangs. Diagnose und beide externen Fehlerläufe sind im Arbeitsplan dokumentiert. Der Operator muss den Slice-Umfang erweitern lassen; nach der Korrektur sind beide externen Erfolgsnachweise erneut erforderlich.
- Runde 1: Halt (Stoppanforderung). Grund: Responsive CSS-Breitenbegrenzung und Tabwechsel im Jahresabschluss-Test korrigiert. Unit-Test: 77/77 Assertions, Exitcode 0. Beide Browserversuche samt aktuellem Stand protokolliert; git diff --check ohne Fehler. Missing prerequisite: Zwei erfolgreiche externe Operator-Browsernachweise für „Balance wealth history“ und „Balance annual commit“ auf dem korrigierten Stand fehlen. Why it cannot be self-provided: Beide eigenen Läufe scheiterten mit Exitcode 1 an „Error: listen EPERM: operation not permitted 127.0.0.1“. Der Implementierer kann seine Sandbox nicht verlassen. Operator action: Beide dokumentierten --only-Befehle außerhalb der Agentensandbox auf dem unveränderten korrigierten Stand ausführen, Ergebnisse einschließlich aktueller Dateihashes, Exitcode 0 und jeweiliger Erfolgsabschlussmeldung im Arbeitsplan eintragen und den Slice fortsetzen lassen.
- Runde 1: Halt (Stoppanforderung). Grund: Korrekturen und protokollierte Unit-Evidenz (77/77 Assertions) sind unverändert; Dateihashes geprüft und Wiederaufnahme dokumentiert. Missing prerequisite: Zwei erfolgreiche externe Operator-Browsernachweise auf dem aktuellen korrigierten Stand fehlen. Why it cannot be self-provided: Der Implementierer kann seine Sandbox nicht verlassen. Beide dokumentierten eigenen Browserversuche scheiterten mit Exitcode 1 an „Error: listen EPERM: operation not permitted 127.0.0.1“. Operator action: Außerhalb der Agentensandbox node tests/browser-smoke.test.mjs --only='Balance wealth history' und node tests/browser-smoke.test.mjs --only='Balance annual commit' ausführen; jeweils Datum, Rolle, Umgebung, HEAD, drei aktuelle Dateihashes, Befehl, Exitcode 0 und fallbezogene Erfolgsabschlussmeldung im Arbeitsplan dokumentieren. Anschließend den Slice fortsetzen lassen.
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
> Korrektheit: Der Renderer setzt jetzt nur noch `aria-labelledby="wealthChartTitle"` und zusätzlich `aria-describedby="wealthChartDesc"`. Titel, Beschreibung und IDs bleiben unverändert. Testabdeckung: `assertChartAccessibility()` in `tests/balance-wealth-history-chart.test.mjs` prüft am öffnenden SVG-Tag die exakten Werte von role, aria-labelledby und aria-describedby. Außerdem verlangt die Funktion genau ein title- und genau ein desc-Element mit vollständigem Text. Der alte Wert `wealthChartTitle wealthChartDesc` würde die Assertion 'Nur der Titel benennt das SVG' verletzen. Die Prüfung läuft für den Hauptstand und für jeden Einzel-, Null- und Großwertstand. `assertWealthBrowserTable()` behält die exakte Rollen- und Namenssuche mit count()===1 bei und prüft zusätzlich beide Attribute, genau ein desc-Element und den vollständigen Beschreibungstext. Im Diff entfallen keine Folgeassertions; in `runBalanceAnnualCommit` kommen nur zwei Tab-Klicks hinzu. Umfang: Der Diff berührt nur freigegebene Pfade, darunter das per Remediation freigegebene `css/balance.css`. Die CSS-Änderung wirkt nur in der Media Query bis 1250px. Prüfprotokoll: Der Unit-Lauf ist mit Exitcode 0 und 77/77 Assertions dokumentiert. Je zwei Sandboxversuche pro Browserfall sind mit Exitcode 1 und EPERM als Sandboxfehler ausgewiesen. Frühere externe Fehlschläge bleiben erhalten. Zwei zweite Operatorläufe sind mit Exitcode 0 und den geforderten Abschlussmeldungen eingetragen. `npm test` ist mit PASS und passendem Fingerprint attestiert. Resume und Idempotenz: Die Protokolleinträge werden nur angehängt; ältere Fehlerläufe werden nicht überschrieben.

Größtes Restrisiko:
> Nicht verifizierbar ist, ob die SHA-256-Werte in den Operatoreinträgen zum geprüften Dateistand passen. Grund: Der Snapshot enthält nur Diffs und keine vollständigen Dateiinhalte, und dieser Prüfauftrag stellt kein Werkzeug zur Hashberechnung bereit. Die Übereinstimmung beruht daher auf den Einträgen von Operator und Implementierer, die sich gegenseitig bestätigen. Die Diffs selbst sind konsistent mit dem protokollierten Korrekturstand nach den Tab- und Layoutkorrekturen.

Bruchbedingung:
> Das Ergebnis kippt, wenn sich nach den Operatorläufen eine der Dateien `app/balance/balance-wealth-history-renderer.js`, `tests/balance-wealth-history-chart.test.mjs`, `tests/browser-smoke.test.mjs` oder `css/balance.css` gegenüber den protokollierten Hashes geändert hat. Es kippt ebenso, wenn `align-self: stretch` in anderen Bereichen der Balance-Seite unter 1250px einen neuen seitenweiten Überlauf erzeugt.

Vorab-Risikoanalyse:
> Wahrscheinlichstes Scheitern nach dem Commit: Die Hashes der Operatornachweise passen nicht zum committeten Stand, weil das Protokoll nach den Läufen erneut bearbeitet wurde. Das Arbeitsplandokument gehört allerdings nicht zu den gehashten Dateien, deshalb ist dieses Risiko begrenzt. Zweites Risiko: Die Tab-Navigation über `getByRole('button', { name: 'Jahres-Update', exact: true })` verletzt den Strict Mode, sobald später ein zweiter Button mit gleichem Namen hinzukommt. Derzeit belegt der externe Lauf mit Exitcode 0, dass der Name eindeutig ist.
<!-- audit:approval:end -->

<!-- audit:reference:begin -->
Technischer Bezug: Lauf `watch-20261002-205259.648172Z-7565d557ae57`, Arbeitseinheit(en) 2; Nachweise in der Recordkette.
<!-- audit:reference:end -->
