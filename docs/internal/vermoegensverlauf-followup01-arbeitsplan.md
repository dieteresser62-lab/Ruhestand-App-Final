# Arbeitsplan: Zugänglicher Name des Vermögensverlaufs

## Auftrag und Ausführungsgrenze

- Grundlage: Befund 1 aus Abnahmereview 2 zum Vermögensverlauf.
- Zielbranch: `feature/vermoegensverlauf`; beim Planen als aktiver Branch bestätigt.
- Referenzcommit des Auftrags: `a942453fe24cd84e80070eebac44c00a37bc48c6`. Die folgenden Feststellungen beruhen auf den tatsächlich gelesenen Quelldateien im aktuellen Arbeitsbaum.
- Dieser Auftrag ist `PLAN_ONLY`. In diesem Schritt wird ausschließlich `docs/internal/vermoegensverlauf-followup01-arbeitsplan.md` geschrieben. Der folgende Slice beschreibt die spätere Umsetzung und wird jetzt nicht ausgeführt.
- Keine Branchtransaktionen, kein Staging und keine Commits. Die vorhandene unversionierte Änderung `.gemini` bleibt unberührt.
- Keine neuen Abhängigkeiten oder Änderungen an Engine, Persistenz, Buildkonfiguration, generierten Artefakten oder Projektregeln. Die Korrektur ändert keine Vermögenswerte oder Erfassungsabläufe.

## Repositorybefund

1. `chartMarkup()` in `app/balance/balance-wealth-history-renderer.js` erzeugt ein SVG mit `role="img"` und `aria-labelledby="wealthChartTitle wealthChartDesc"`. Der Titel enthält exakt „Vermögensverlauf in nominalen Euro“. Die Beschreibung enthält Erläuterungen zu Stapelgruppen, Anlassmarkierungen und Datentabelle. Beide Texte werden derzeit zum zugänglichen Namen verkettet.
2. `tests/balance-wealth-history-chart.test.mjs` rendert synthetische Jahres- und manuelle Stände über `renderBalanceWealthHistory()`. Die vorhandene Assertion prüft nur `role="img"` und das Vorhandensein von `aria-labelledby`; sie schützt die Trennung von Name und Beschreibung nicht.
3. `assertWealthBrowserTable()` in `tests/browser-smoke.test.mjs` sucht das Diagramm bereits mit `page.getByRole('img', { name: 'Vermögensverlauf in nominalen Euro', exact: true })` und verlangt genau einen Treffer. Diese Prüfung ist richtig und bleibt streng. Beide betroffenen Browserfälle rufen den Helfer mehrfach auf.
4. Der Browserrunner unterstützt die beiden exakten `--only`-Fallnamen, startet einen lokalen HTTP-Server und Chromium über Playwright und meldet bei Fehlern Exitcode 1. `tests/README.md` dokumentiert beide Befehle bereits. `npm test` enthält dieses separate Browsergate nicht.
5. Architektur, Modulzuschnitt und Nutzer-Workflow bleiben unverändert; ein weiterer Sync von README, Handbuch oder technischen Referenzen ist für diese ARIA-Korrektur nicht erforderlich. Der fehlende Ausführungsnachweis wird im Prüfprotokoll dieses Arbeitsplans nachgetragen.

## Verbindlicher Korrekturvertrag

Der zugängliche Name des dargestellten Verlaufs-SVG ist exakt „Vermögensverlauf in nominalen Euro“. Dafür referenziert `aria-labelledby` ausschließlich `wealthChartTitle`. Die vorhandene Langbeschreibung wird ausschließlich über `aria-describedby="wealthChartDesc"` zugeordnet. Titel, Beschreibungstext, Rolle, Diagrammgeometrie und Datentabelle bleiben erhalten. Die exakte Browserabfrage darf weder durch eine Teiltextsuche noch durch eine alternative CSS-Abfrage ersetzt werden.

## Geplante spätere Umsetzung

### Slice 1 - SVG-Namen und Beschreibung trennen und Browsernachweis sichern

**Ziel**
Die fehlerhafte ARIA-Zuordnung korrigieren, ihre Wiederkehr mit Unit- und Browserprüfungen verhindern und die zuvor abgebrochenen Durchstiche vollständig nachweisen.

**Exakter Änderungspfad**
- `app/balance/balance-wealth-history-renderer.js`
- `css/balance.css`
- `docs/internal/slice-vermoegensverlauf-followup01-arbeitsplan-01-svg-namen-und-beschreibung-trennen-und-browsernachweis-sichern.md`
- `docs/internal/vermoegensverlauf-followup01-arbeitsplan.md`
- `docs/internal/vermoegensverlauf-followup01-implement-review-65188890.md`
- `tests/balance-wealth-history-chart.test.mjs`
- `tests/browser-smoke.test.mjs`

Der Orchestrator hat den Umfang nach den externen Fehlerläufen um `css/balance.css` erweitert. Die beiden Auditpfade gehören ebenfalls zur aktuellen Pfadfreigabe; ihre verwalteten Auditbereiche bleiben dem Orchestrator vorbehalten.

**Umsetzung**
- Im öffnenden SVG-Tag `aria-labelledby="wealthChartTitle wealthChartDesc"` durch `aria-labelledby="wealthChartTitle"` ersetzen und `aria-describedby="wealthChartDesc"` ergänzen. Die referenzierten `title`- und `desc`-Elemente erhalten ihre bestehenden IDs und Texte.
- Die bisher unpräzise Unit-Assertion durch getrennte Assertions am erzeugten SVG ersetzen: Rolle `img`, exakter Attributwert von `aria-labelledby`, exakter Attributwert von `aria-describedby`, genau ein referenziertes Titel- und Beschreibungselement sowie exakter Titeltext und erhaltene, nicht leere Beschreibung. Den Attributwert am öffnenden SVG-Tag prüfen, damit zusätzliche IDs im Namen zuverlässig auffallen. Vorhandene Werte-, Nullstands-, Fehler- und Reloadprüfungen beibehalten.
- In `assertWealthBrowserTable()` die bestehende Rollenabfrage mit `exact: true` und `count() === 1` beibehalten. Mit dem vorhandenen `assert()` und Playwright-Locatoren zusätzlich die beiden exakten ARIA-Attributwerte über `chart.getAttribute()` prüfen. Genau ein `desc`-Element mit der referenzierten ID verlangen und dessen `textContent()` mit dem vollständigen vorhandenen Beschreibungstext vergleichen. Dafür sind keine zusätzlichen Imports oder Abhängigkeiten nötig. So prüfen beide realen Durchstiche den berechneten Namen und die separate Beschreibungszuordnung.
- Keine Fälle, Folgeassertions oder deterministischen Fixtures entfernen. Die Fälle laufen nach der ersten SVG-Prüfung bis zu ihren bestehenden Abschlussprüfungen durch.
- Nach der freigegebenen Umfangserweiterung: Im responsiven Spaltenlayout bis 1250px die Ergebnisspalte mit `align-self: stretch` an die verfügbare Breite binden. SVG und Tabelle behalten ihre lokalen Scrollregionen. Im Jahresabschluss-Browserfall vor der Jahresauswahl den Tab „Ausgaben-Check“ öffnen und danach vor dem Wiederholungsknopf zum Tab „Jahres-Update“ zurückkehren. Die vorhandenen 375px-, Wiederholungs- und Reloadassertions bleiben unverändert.
- Nach der Umsetzung versucht der Implementierer beide unten genannten Browserbefehle selbst, auch wenn bereits der erste an der Sandbox scheitert. Er ergänzt das Prüfprotokoll mit den tatsächlichen Ergebnissen seiner Unit- und Browserläufe. Die verpflichtenden externen Läufe führt der Operator aus und dokumentiert sie selbst im selben Prüfprotokoll. Prüfer und Finalprüfer lesen diese Einträge ausschließlich und verfassen keine Repository-Einträge.

**Akzeptanzkriterien**
- SOURCE: Jedes gerenderte Verlaufs-SVG hat `role="img"`, `aria-labelledby="wealthChartTitle"` und `aria-describedby="wealthChartDesc"`. Der Name ist exakt „Vermögensverlauf in nominalen Euro“; die vollständige vorhandene Langbeschreibung ist als Beschreibung erreichbar.
- SOURCE: `tests/balance-wealth-history-chart.test.mjs` enthält Assertions auf den vollständigen Wert `wealthChartTitle` des Namensattributs und die separate Beschreibungsreferenz am erzeugten SVG. Die ursprüngliche Zuordnung beider IDs zum Namen würde diese Assertions verletzen. Das Prüfprotokoll enthält den tatsächlichen gezielten Unit-Lauf mit Datum, Stand, Befehl, Exitcode 0 und Ergebnis.
- SOURCE: `assertWealthBrowserTable()` behält die exakte Rollen-/Namenssuche und genau einen Treffer bei und prüft zusätzlich die separate Beschreibungszuordnung und den vollständigen Beschreibungstext. Die vorhandenen Folgeassertions für Tagesersetzung, Reload, Profilwechsel und Profilisolation, 375px-Ansicht, Nullstand und Legacy-Import sowie Jahresstand, Wiederholung und Reload bleiben im Testquelltext erhalten.
- SOURCE: Das Prüfprotokoll enthält für beide vom Implementierer selbst versuchten `--only`-Läufe je Datum, Rolle, Ausführungsumgebung, geprüften Stand, exakten Befehl, tatsächlichen Exitcode und Abschlussmeldung oder konkrete Fehlermeldung. Ein Sandboxfehler wird als solcher ausgewiesen und nicht als bestandener Browserfall verbucht.
- SOURCE: Das Prüfprotokoll enthält zusätzlich zwei vom Operator eingetragene externe Erfolgsnachweise, jeweils mit Datum, Rolle, Ausführungsumgebung außerhalb der Agentensandbox, geprüftem Stand, exaktem Befehl, Exitcode 0 und der jeweiligen Abschlussmeldung `Browser smoke passed: Balance wealth history` beziehungsweise `Browser smoke passed: Balance annual commit`. Die darin angegebenen SHA-256-Werte der drei Quell-/Testdateien stimmen mit dem zu prüfenden Repositorystand überein. Fehlende oder abweichende Einträge erfüllen dieses Kriterium nicht; ein grünes `npm test` ersetzt sie nicht.

**Prüfgrenze**
Alle SOURCE-Kriterien sind anhand der Quell-/Testdateien und des gespeicherten Prüfprotokolls überprüfbar. Der Slice-Prüfer muss dafür weder einen externen Lauf veranlassen noch das Repository bearbeiten. Die nachfolgenden Ausführungspflichten beschreiben, wie diese überprüfbare Evidenz vor der Fertigmeldung entsteht.

**Fokussierte Validierung und Zuständigkeit**
1. Der Implementierer korrigiert Renderer und Tests und führt `node tests/run-single.mjs tests/balance-wealth-history-chart.test.mjs` aus. Fehler im erlaubten Umfang werden behoben, bevor der Nachweis als erfolgreich eingetragen wird.
2. Der Implementierer führt nacheinander `node tests/browser-smoke.test.mjs --only='Balance wealth history'` und `node tests/browser-smoke.test.mjs --only='Balance annual commit'` aus. Er versucht beide Befehle unabhängig vom Ergebnis des ersten und dokumentiert jeden Versuch tatsächlich. Bei fachlichen Assertionfehlern behebt er die Ursache innerhalb des Slice-Umfangs und wiederholt die betroffenen Prüfungen. Keine Installation oder Netzversuche zur Umgehung fehlender Voraussetzungen.
3. Der Implementierer trägt für jeden Versuch Datum mit Zeitzone, Rolle, Umgebung, `git rev-parse HEAD`, SHA-256-Werte der drei Dateien `app/balance/balance-wealth-history-renderer.js`, `tests/balance-wealth-history-chart.test.mjs` und `tests/browser-smoke.test.mjs`, exakten Befehl, Exitcode und Abschlussmeldung beziehungsweise konkrete Fehlermeldung ein. Die Dateihashes binden die Evidenz auch bei noch nicht committierten Änderungen an den geprüften Stand. Der Arbeitsplan selbst wird nicht mitgehasht, damit das Eintragen der Evidenz ihren Standbezug nicht verändert.
4. Fehlen die zwei externen Erfolgsnachweise, meldet der Implementierer den Slice nicht fertig. Insbesondere nach einem verhinderten Server-/Browserstart dokumentiert er beide Versuche und gibt `stop_result` mit `OPERATOR-PREREQUISITE-MISSING` zurück. Auch erfolgreiche Sandboxläufe ersetzen die im Abnahmereview ausdrücklich geforderten externen Läufe nicht. Die Stoppbegründung enthält genau einmal je folgende Pflichtzeile, mit den tatsächlichen Fehlern und noch fehlenden Nachweisen konkretisiert:

   ```text
   Missing prerequisite: Zwei dokumentierte erfolgreiche Browserläufe außerhalb der Agentensandbox auf dem korrigierten Stand; gegebenenfalls lokal startfähiger HTTP-Server und Chromium.
   Why it cannot be self-provided: Der Implementierer kann seine Sandbox nicht verlassen und keine externe Browserumgebung bereitstellen; die tatsächlichen Ergebnisse und gegebenenfalls Startfehler der beiden eigenen Versuche stehen im Prüfprotokoll.
   Operator action: Auf dem unveränderten korrigierten Stand außerhalb der Agentensandbox beide angegebenen --only-Befehle ausführen, ihre Ergebnisse mit Standbezug im Prüfprotokoll dieses Arbeitsplans eintragen und den angehaltenen Slice anschließend fortsetzen lassen.
   ```

   Als `remediation_paths` wird ausschließlich `docs/internal/vermoegensverlauf-followup01-arbeitsplan.md` angegeben. Dieser Halt betrifft das hier ausdrücklich verpflichtende zusätzliche Browsergate. Die allgemeine Regel, Sandboxfehler nicht zum Hindernis für die vom Orchestrator ausführbare Node-Standardsuite zu machen, bleibt bestehen; `npm test` ist kein Ersatz für dieses Gate.
5. Der Operator führt im Repository auf dem korrigierten Zielbranch außerhalb der Agentensandbox beide Befehle aus: `node tests/browser-smoke.test.mjs --only='Balance wealth history'` und `node tests/browser-smoke.test.mjs --only='Balance annual commit'`. Falls Werkzeuge fehlen, stellt nur der Operator sie in seiner externen Umgebung bereit. Er trägt für jeden Lauf die Felder aus Schritt 3 mit der Umgebung „außerhalb der Agentensandbox“ direkt im Prüfprotokoll ein. Erwartet sind Exitcode 0 und die fallbezogene Abschlussmeldung. Ein Fehlerlauf bleibt sichtbar und offen; er wird nicht als Erfolg attestiert. Der Operator ändert dabei nur dieses Arbeitsplandokument, keine Produkt-/Testdateien, Branches oder Commits. Danach veranlasst er die Wiederaufnahme des angehaltenen Slice über den Orchestrator.
6. Der Implementierer liest bei Wiederaufnahme die externen Einträge und vergleicht deren drei Dateihashes mit dem aktuellen Stand. Erst bei zwei gültigen Erfolgsnachweisen und erfüllten SOURCE-Kriterien meldet er den Slice fertig. Nach Änderungen an Renderer oder Tests werden die betroffenen eigenen Prüfungen und beide externen Nachweise erneuert. Fehlt weiter eine externe Voraussetzung, bleibt der Slice mit demselben konkretisierten Stoppgrund angehalten. Er behauptet keine selbst ausgeführten externen Läufe.
7. Der Orchestrator führt anschließend gemäß bestehendem Ablauf `npm test` aus. Seine normale Validierungsattestierung deckt ausschließlich diese Standardsuite ab. Unabhängiger Prüfer und Finalprüfer beurteilen lesend den Repositorystand und die gespeicherten Nachweise; ihre Urteile verarbeitet der Orchestrator. Für diesen Befund sind die zwei gezielten vollständigen Browserfälle Pflicht; ein zusätzlicher Gesamtlauf `npm run test:browser` kann separat erfolgen.

## Risiken und Gegenprüfung

- Eine Abschwächung der exakten Namenssuche würde den Defekt verdecken. Der Prüfer kontrolliert daher die unveränderte Strenge der bestehenden Browserassertion sowie den getrennten Beschreibungsnachweis.
- Eine bloße Prüfung auf das Vorhandensein der ARIA-Attribute schützt nicht gegen zusätzliche Namensreferenzen. Der Unit-Test vergleicht deren vollständige Werte.
- Ein Testabbruch vor den späteren Interaktionen belegt die früheren Browserkriterien nicht. Beide Fallläufe müssen ihre jeweilige Abschlussmeldung erreichen und Exitcode 0 liefern.
- Prüfbelege müssen zum korrigierten Stand gehören. Ändert sich danach Renderer oder Testlogik, sind die betroffenen Läufe erneut durchzuführen.
- Weitere fachliche Fehler aus dem Browserdurchstich werden gemeldet; Änderungen außerhalb der exakten Slice-Pfade benötigen eine Scope-Erweiterung. Keine stillen Vertragsänderungen an Jahresabschluss, Profilwechsel oder Persistenz.

## Prüfprotokoll

Stand bei Erstellung dieses Plans: Nur Repositoryprüfung und Planung durchgeführt; keine Produktänderungen und keine Unit- oder Browserläufe. Die fehlenden Browsernachweise sind noch offen.

| Prüfung | Zuständigkeit | Nachzutragender Nachweis | Status |
| --- | --- | --- | --- |
| Gezielter Diagramm-Unit-Test | Implementierer führt aus und schreibt | Datum, Rolle, Umgebung, HEAD, drei Dateihashes, Befehl, Exitcode und Ergebnis | Bestanden: 77/77 Assertions, siehe Eintrag vom 2026-10-02 |
| `Balance wealth history` in der Sandbox | Implementierer führt aus und schreibt | Dieselben Standfelder, exakter Befehl, tatsächlicher Exitcode, Abschlussmeldung oder konkreter Fehler | Nach Layoutkorrektur erneut versucht: Sandboxfehler beim Serverstart, Exitcode 1; kein bestandener Browserfall |
| `Balance annual commit` in der Sandbox | Implementierer führt aus und schreibt | Dieselben Standfelder, exakter Befehl, tatsächlicher Exitcode, Abschlussmeldung oder konkreter Fehler | Nach Tabkorrektur erneut versucht: Sandboxfehler beim Serverstart, Exitcode 1; kein bestandener Browserfall |
| `Balance wealth history` außerhalb der Sandbox | Operator führt aus und schreibt | Datum, Rolle, externe Umgebung, HEAD, drei Dateihashes, exakter Befehl, Exitcode 0 und Abschlussmeldung | Bestanden am 2026-10-02T23:04:27+02:00 (Operator, zweiter Versuch) |
| `Balance annual commit` außerhalb der Sandbox | Operator führt aus und schreibt | Datum, Rolle, externe Umgebung, HEAD, drei Dateihashes, exakter Befehl, Exitcode 0 und Abschlussmeldung | Bestanden am 2026-10-02T23:04:31+02:00 (Operator, zweiter Versuch) |

Jeder tatsächliche Versuch wird als eigener datierter Eintrag unter dieser Tabelle ergänzt; Wiederholungen überschreiben keine vorherigen Fehlerläufe. Die Tabelle wird erst nach dem jeweiligen Nachweis auf bestanden gesetzt. Die Standardsuite und Reviewurteile protokolliert der Orchestrator in seinen regulären Laufdokumenten beziehungsweise im von ihm verwalteten Auditbereich unten. Prüfer und Finalprüfer ändern weder dieses Prüfprotokoll noch andere Repository-Dateien.

Die Planung ist mit dem verifizierten Arbeitsplandokument abgeschlossen. Die Behebung von Befund 1 ist erst nach Umsetzung und den dokumentierten Pflichtnachweisen abgeschlossen.

### Implementierer: Gezielter Diagramm-Unit-Test am 2026-10-02

- Datum: `2026-10-02T22:54:10+02:00` (Europe/Berlin).
- Rolle: Implementierer (Codex).
- Ausführungsumgebung: Linux, Agentensandbox im Repository, Node.js `v22.23.2`.
- Geprüfter Stand: Branch `feature/vermoegensverlauf`, `git rev-parse HEAD`: `6e4695b8ac47577506d7cda04ba0a515cbb1a660`; korrigierter, noch nicht committierter Arbeitsbaum.
- SHA-256 `app/balance/balance-wealth-history-renderer.js`: `848e6fb5fa92734eb3b175a41a390154fcd9264c68094d4bb259a55d000e4aa6`.
- SHA-256 `tests/balance-wealth-history-chart.test.mjs`: `732b3c56ccfab632bf1a8f63340a2d7c7ed514aba1fc0ceab2ef5a3afa134b2a`.
- SHA-256 `tests/browser-smoke.test.mjs`: `6ebe7d6af9bb14450adc3eccd21d3be0b39101b31b3568cc82cb14fa15fa3ec5`.
- Exakter Testbefehl: `node tests/run-single.mjs tests/balance-wealth-history-chart.test.mjs`.
- Tatsächlicher Exitcode: `0`.
- Ergebnis: `SINGLE TEST SUMMARY:`, `Total Assertions: 77`, `Passed: 77`, `Failed Assertions: 0`, `Failed Files: 0`.

### Implementierer: Browserversuch „Balance wealth history“ am 2026-10-02

- Datum: `2026-10-02T22:54:17+02:00` (Europe/Berlin).
- Rolle: Implementierer (Codex).
- Ausführungsumgebung: Linux, Agentensandbox im Repository, Node.js `v22.23.2`.
- Geprüfter Stand: Branch `feature/vermoegensverlauf`, `git rev-parse HEAD`: `6e4695b8ac47577506d7cda04ba0a515cbb1a660`; korrigierter, noch nicht committierter Arbeitsbaum.
- SHA-256 `app/balance/balance-wealth-history-renderer.js`: `848e6fb5fa92734eb3b175a41a390154fcd9264c68094d4bb259a55d000e4aa6`.
- SHA-256 `tests/balance-wealth-history-chart.test.mjs`: `732b3c56ccfab632bf1a8f63340a2d7c7ed514aba1fc0ceab2ef5a3afa134b2a`.
- SHA-256 `tests/browser-smoke.test.mjs`: `6ebe7d6af9bb14450adc3eccd21d3be0b39101b31b3568cc82cb14fa15fa3ec5`.
- Exakter Testbefehl: `node tests/browser-smoke.test.mjs --only='Balance wealth history'`.
- Tatsächlicher Exitcode: `1`.
- Tatsächliche Fehlermeldung: `Browser smoke failed:`; `Error: listen EPERM: operation not permitted 127.0.0.1` (`code: 'EPERM'`, `errno: -1`, `syscall: 'listen'`, `address: '127.0.0.1'`).
- Bewertung: Sandboxfehler beim lokalen HTTP-Serverstart. Keine Browserassertions ausgeführt, keine Erfolgsabschlussmeldung; der Browserfall ist nicht bestanden und ersetzt keinen externen Nachweis.

### Implementierer: Browserversuch „Balance annual commit“ am 2026-10-02

- Datum: `2026-10-02T22:54:18+02:00` (Europe/Berlin).
- Rolle: Implementierer (Codex).
- Ausführungsumgebung: Linux, Agentensandbox im Repository, Node.js `v22.23.2`.
- Geprüfter Stand: Branch `feature/vermoegensverlauf`, `git rev-parse HEAD`: `6e4695b8ac47577506d7cda04ba0a515cbb1a660`; korrigierter, noch nicht committierter Arbeitsbaum.
- SHA-256 `app/balance/balance-wealth-history-renderer.js`: `848e6fb5fa92734eb3b175a41a390154fcd9264c68094d4bb259a55d000e4aa6`.
- SHA-256 `tests/balance-wealth-history-chart.test.mjs`: `732b3c56ccfab632bf1a8f63340a2d7c7ed514aba1fc0ceab2ef5a3afa134b2a`.
- SHA-256 `tests/browser-smoke.test.mjs`: `6ebe7d6af9bb14450adc3eccd21d3be0b39101b31b3568cc82cb14fa15fa3ec5`.
- Exakter Testbefehl: `node tests/browser-smoke.test.mjs --only='Balance annual commit'`.
- Tatsächlicher Exitcode: `1`.
- Tatsächliche Fehlermeldung: `Browser smoke failed:`; `Error: listen EPERM: operation not permitted 127.0.0.1` (`code: 'EPERM'`, `errno: -1`, `syscall: 'listen'`, `address: '127.0.0.1'`).
- Bewertung: Unabhängig vom ersten Fehler erneut versucht. Sandboxfehler beim lokalen HTTP-Serverstart; keine Browserassertions ausgeführt, keine Erfolgsabschlussmeldung. Der Browserfall ist nicht bestanden und ersetzt keinen externen Nachweis.

### Operator: Browserlauf „Balance wealth history“ außerhalb der Sandbox am 2026-10-02

- Datum: `2026-10-02T22:56:36+02:00` (Europe/Berlin).
- Rolle: Operator (Steuerung durch Claude Code im Auftrag des Nutzers).
- Ausführungsumgebung: außerhalb der Agentensandbox; WSL2 Ubuntu (Linux 6.6.87.1-microsoft-standard-WSL2), Node.js `v22.23.2`, Playwright mit installiertem Chromium (headless).
- Geprüfter Stand: Branch `feature/vermoegensverlauf`, `git rev-parse HEAD`: `6e4695b8ac47577506d7cda04ba0a515cbb1a660`; korrigierter, noch nicht committierter Arbeitsbaum.
- SHA-256 `app/balance/balance-wealth-history-renderer.js`: `848e6fb5fa92734eb3b175a41a390154fcd9264c68094d4bb259a55d000e4aa6`.
- SHA-256 `tests/balance-wealth-history-chart.test.mjs`: `732b3c56ccfab632bf1a8f63340a2d7c7ed514aba1fc0ceab2ef5a3afa134b2a`.
- SHA-256 `tests/browser-smoke.test.mjs`: `6ebe7d6af9bb14450adc3eccd21d3be0b39101b31b3568cc82cb14fa15fa3ec5`.
- Exakter Testbefehl: `node tests/browser-smoke.test.mjs --only='Balance wealth history'`.
- Tatsächlicher Exitcode: `1`.
- Tatsächliche Fehlermeldung: `Browser smoke failed:` `Error: Der Verlauf verursacht keinen zusätzlichen seitenweiten Überlauf` (Assertion in `runBalanceWealthHistory`, `tests/browser-smoke.test.mjs:875`, bei Viewport-Breite 375).
- Bewertung: **Nicht bestanden, echter Befund.** In der schmalen Ansicht erzeugt der Bereich `.wealth-history` einen seitenweiten horizontalen Überlauf (`scrollWidth` mit Verlauf größer als ohne Verlauf).

### Operator: Browserlauf „Balance annual commit“ außerhalb der Sandbox am 2026-10-02

- Datum: `2026-10-02T22:56:40+02:00` (Europe/Berlin).
- Rolle: Operator (Steuerung durch Claude Code im Auftrag des Nutzers).
- Ausführungsumgebung: außerhalb der Agentensandbox; WSL2 Ubuntu (Linux 6.6.87.1-microsoft-standard-WSL2), Node.js `v22.23.2`, Playwright mit installiertem Chromium (headless).
- Geprüfter Stand: Branch `feature/vermoegensverlauf`, `git rev-parse HEAD`: `6e4695b8ac47577506d7cda04ba0a515cbb1a660`; korrigierter, noch nicht committierter Arbeitsbaum.
- SHA-256 `app/balance/balance-wealth-history-renderer.js`: `848e6fb5fa92734eb3b175a41a390154fcd9264c68094d4bb259a55d000e4aa6`.
- SHA-256 `tests/balance-wealth-history-chart.test.mjs`: `732b3c56ccfab632bf1a8f63340a2d7c7ed514aba1fc0ceab2ef5a3afa134b2a`.
- SHA-256 `tests/browser-smoke.test.mjs`: `6ebe7d6af9bb14450adc3eccd21d3be0b39101b31b3568cc82cb14fa15fa3ec5`.
- Exakter Testbefehl: `node tests/browser-smoke.test.mjs --only='Balance annual commit'`.
- Tatsächlicher Exitcode: `1`.
- Tatsächliche Fehlermeldung: `Browser smoke failed:` `locator.selectOption: Timeout 30000ms exceeded.` beim Warten auf `#expensesYearSelect` („element is not visible“), in `runBalanceAnnualCommit` (`tests/browser-smoke.test.mjs:967`).
- Gegenprobe auf `main` (`a942453`, sauberer Klon, gleiche Umgebung, `2026-10-02T22:57`): derselbe Befehl endet mit Exitcode `0` und `Browser smoke passed: Balance annual commit`.
- Bewertung: **Nicht bestanden, Regression durch diesen Zweig.** Im Jahresabschluss-Ablauf ist die Jahresauswahl der Ausgaben nicht mehr sichtbar.

Beide externen Operator-Nachweise sind damit **nicht erbracht**: Die Läufe zeigen zwei echte Fehler, die vor einem Abschluss behoben werden müssen. Nach einer Korrektur führt der Operator beide Befehle erneut aus und ergänzt neue datierte Einträge.

### Offene Voraussetzung nach der ersten Umsetzung (vor der Umfangserweiterung)

Die ARIA-Trennung und die Unit-/Browserassertions sind umgesetzt. Die bestehende exakte Rollen-/Namenssuche samt Einzeltrefferprüfung und sämtliche Folgeassertions bleiben erhalten. Die volle Standardsuite wurde vom Implementierer nicht ausgeführt; sie bleibt Aufgabe des Orchestrators. `git diff --check` meldet keine Fehler.

Beide externen Operator-Erfolgsnachweise fehlen weiterhin. Bei Wiederaufnahme zeigen die Operator-Einträge zwei tatsächliche Fehler. Der Slice hält nun mit `SCOPE-EXTENSION-REQUESTED` an: Für die Layoutkorrektur ist zusätzlich `css/balance.css` erforderlich. Nach der Korrektur muss der Operator beide oben angegebenen Browserbefehle außerhalb der Agentensandbox erneut ausführen und jeweils Datum, Rolle, Umgebung, HEAD, die drei SHA-256-Werte, Befehl, Exitcode 0 sowie `Browser smoke passed: Balance wealth history` beziehungsweise `Browser smoke passed: Balance annual commit` in diesem Prüfprotokoll eintragen. Erst nach Hashabgleich bei der Wiederaufnahme kann die Fertigmeldung erfolgen.

### Implementierer: Wiederaufnahme und Umfangsprüfung am 2026-10-02

- Datum der Standprüfung: `2026-10-02T22:58:53+02:00` (Europe/Berlin).
- Rolle und Umgebung: Implementierer (Codex), Linux-Agentensandbox, Node.js `v22.23.2`.
- Geprüfter Stand: Branch `feature/vermoegensverlauf`, HEAD `6e4695b8ac47577506d7cda04ba0a515cbb1a660`; vorhandener korrigierter Arbeitsbaum. Alle drei mit `sha256sum` nachgerechneten Quell-/Testdateihashes stimmen mit den oben protokollierten Implementierer- und Operator-Läufen überein.
- Die bestehende ARIA-Trennung, die exakten Unit-Assertions und die separate Browser-Beschreibungsprüfung erfüllen den Quellvertrag. Der Browserdiff ergänzt ausschließlich Assertions im Helfer; sämtliche Folgeassertions sind erhalten.
- Layoutbefund: `css/balance.css` definiert `.results-column` mit `align-self: flex-start`. Die Media Query bis 1250px schaltet `.main-layout` auf Spaltenlayout mit `align-items: stretch`, setzt aber für `.results-column` nur `position: static`. Die eigene Ausrichtung verhindert somit das Strecken der Ergebnisspalte. Die vorhandenen Grenzen der `.wealth-scroll`-Regionen beziehen sich auf diese Spalte. Deren responsive Breitenbegrenzung muss am bestehenden CSS-Layout korrigiert und durch den unveränderten 375px-Browserfall nachgewiesen werden. Diese Datei ist nicht freigegeben; keine Layoutänderung wurde vorgenommen.
- Jahresauswahl: `#expensesYearSelect` befindet sich in `#tab-ausgaben`; `.tab-panel` ist ohne `.active` unsichtbar. Der Jahresabschlussfall ruft nach der SVG-Prüfung `selectOption('2026')` auf, ohne den Ausgaben-Tab zu öffnen. Der Test muss zuerst den echten Tab „Ausgaben-Check“ öffnen und danach vor der Bedienung von `#btnJahresUpdate` zum Tab „Jahres-Update“ zurückkehren. Diese Anpassung wäre innerhalb von `tests/browser-smoke.test.mjs` möglich; die Wiederholungsassertions müssen erhalten bleiben.
- Aktueller Halt: `SCOPE-EXTENSION-REQUESTED`, zusätzlicher erforderlicher Pfad `css/balance.css`. Der Operator muss den Slice-Umfang über den Orchestrator erweitern lassen. Renderer und Tests bleiben bis dahin unverändert; die vorhandenen tatsächlichen Testläufe werden nicht als neue Läufe ausgegeben. Die volle Standardsuite wurde weiterhin nicht vom Implementierer ausgeführt.

### Implementierer: Korrektur nach freigegebener Umfangserweiterung am 2026-10-02

- Rolle und Umgebung: Implementierer (Codex), Linux-Agentensandbox, Node.js `v22.23.2`.
- Geprüfter Stand: Branch `feature/vermoegensverlauf`, HEAD `6e4695b8ac47577506d7cda04ba0a515cbb1a660`; korrigierter, noch nicht committierter Arbeitsbaum.
- `css/balance.css`: Die bestehende Media Query bis 1250px setzt jetzt für `.results-column` zusätzlich `align-self: stretch`. Dadurch folgt die Breite der Ergebnisspalte dem Spaltenlayout; die Mindestbreite des SVG und das lokale `overflow-x: auto` von SVG-/Tabellenregion bleiben erhalten. Keine globale Überlaufunterdrückung.
- `tests/browser-smoke.test.mjs`: Der Jahresabschlussfall öffnet vor `selectOption('2026')` den echten Tab „Ausgaben-Check“ und vor `#btnJahresUpdate` wieder „Jahres-Update“. Die vorhandenen Prüfungen von Jahresstand, Wiederholung, Snapshotanzahl und Reload bleiben erhalten. Die ARIA-Prüfungen und sämtliche Folgeassertions des Verlaufsfalls bleiben unverändert.
- SHA-256 `css/balance.css`: `4062164ac7eb042d557cbaaab42d7adc7e610a8f25be6ea80cfc94e3402c6b8f` (zusätzlicher Standbezug für die Layoutkorrektur).
- Die folgenden drei Läufe wurden auf demselben Quell-/Test- und CSS-Stand ausgeführt. Die bestehenden externen Fehlernachweise bleiben sichtbar; sie belegen keinen Erfolg der nun korrigierten Fassung.

### Implementierer: Wiederholter Diagramm-Unit-Test am 2026-10-02

- Datum: `2026-10-02T23:01:27+02:00` (Europe/Berlin).
- Rolle: Implementierer (Codex).
- Ausführungsumgebung: Linux, Agentensandbox im Repository, Node.js `v22.23.2`.
- Geprüfter Stand: Branch `feature/vermoegensverlauf`, `git rev-parse HEAD`: `6e4695b8ac47577506d7cda04ba0a515cbb1a660`; korrigierter, noch nicht committierter Arbeitsbaum nach Layout- und Tabkorrektur.
- SHA-256 `app/balance/balance-wealth-history-renderer.js`: `848e6fb5fa92734eb3b175a41a390154fcd9264c68094d4bb259a55d000e4aa6`.
- SHA-256 `tests/balance-wealth-history-chart.test.mjs`: `732b3c56ccfab632bf1a8f63340a2d7c7ed514aba1fc0ceab2ef5a3afa134b2a`.
- SHA-256 `tests/browser-smoke.test.mjs`: `e6fce88f47e41749b52f7a840dd479cde38b89ba46cbfce34129792d1ac8c5bd`.
- Exakter Testbefehl: `node tests/run-single.mjs tests/balance-wealth-history-chart.test.mjs`.
- Tatsächlicher Exitcode: `0`.
- Ergebnis: `SINGLE TEST SUMMARY:`, `Total Assertions: 77`, `Passed: 77`, `Failed Assertions: 0`, `Failed Files: 0`.

### Implementierer: Wiederholter Browserversuch „Balance wealth history“ am 2026-10-02

- Datum: `2026-10-02T23:01:31+02:00` (Europe/Berlin).
- Rolle: Implementierer (Codex).
- Ausführungsumgebung: Linux, Agentensandbox im Repository, Node.js `v22.23.2`.
- Geprüfter Stand: Branch `feature/vermoegensverlauf`, `git rev-parse HEAD`: `6e4695b8ac47577506d7cda04ba0a515cbb1a660`; korrigierter, noch nicht committierter Arbeitsbaum nach Layout- und Tabkorrektur.
- SHA-256 `app/balance/balance-wealth-history-renderer.js`: `848e6fb5fa92734eb3b175a41a390154fcd9264c68094d4bb259a55d000e4aa6`.
- SHA-256 `tests/balance-wealth-history-chart.test.mjs`: `732b3c56ccfab632bf1a8f63340a2d7c7ed514aba1fc0ceab2ef5a3afa134b2a`.
- SHA-256 `tests/browser-smoke.test.mjs`: `e6fce88f47e41749b52f7a840dd479cde38b89ba46cbfce34129792d1ac8c5bd`.
- Exakter Testbefehl: `node tests/browser-smoke.test.mjs --only='Balance wealth history'`.
- Tatsächlicher Exitcode: `1`.
- Tatsächliche Fehlermeldung: `Browser smoke failed:`; `Error: listen EPERM: operation not permitted 127.0.0.1` (`code: 'EPERM'`, `errno: -1`, `syscall: 'listen'`, `address: '127.0.0.1'`).
- Bewertung: Sandboxfehler beim lokalen HTTP-Serverstart. Keine Browserassertions ausgeführt, keine Erfolgsabschlussmeldung. Insbesondere ist die 375px-Korrektur damit noch nicht im Browser bestätigt; kein bestandener Browserfall und kein externer Nachweis.

### Implementierer: Wiederholter Browserversuch „Balance annual commit“ am 2026-10-02

- Datum: `2026-10-02T23:01:35+02:00` (Europe/Berlin).
- Rolle: Implementierer (Codex).
- Ausführungsumgebung: Linux, Agentensandbox im Repository, Node.js `v22.23.2`.
- Geprüfter Stand: Branch `feature/vermoegensverlauf`, `git rev-parse HEAD`: `6e4695b8ac47577506d7cda04ba0a515cbb1a660`; korrigierter, noch nicht committierter Arbeitsbaum nach Layout- und Tabkorrektur.
- SHA-256 `app/balance/balance-wealth-history-renderer.js`: `848e6fb5fa92734eb3b175a41a390154fcd9264c68094d4bb259a55d000e4aa6`.
- SHA-256 `tests/balance-wealth-history-chart.test.mjs`: `732b3c56ccfab632bf1a8f63340a2d7c7ed514aba1fc0ceab2ef5a3afa134b2a`.
- SHA-256 `tests/browser-smoke.test.mjs`: `e6fce88f47e41749b52f7a840dd479cde38b89ba46cbfce34129792d1ac8c5bd`.
- Exakter Testbefehl: `node tests/browser-smoke.test.mjs --only='Balance annual commit'`.
- Tatsächlicher Exitcode: `1`.
- Tatsächliche Fehlermeldung: `Browser smoke failed:`; `Error: listen EPERM: operation not permitted 127.0.0.1` (`code: 'EPERM'`, `errno: -1`, `syscall: 'listen'`, `address: '127.0.0.1'`).
- Bewertung: Unabhängig vom ersten Fehler erneut versucht. Sandboxfehler beim lokalen HTTP-Serverstart, keine Browserassertions ausgeführt, keine Erfolgsabschlussmeldung. Die Tabkorrektur und der vollständige Jahresabschlussfall sind damit noch nicht im Browser bestätigt; kein bestandener Browserfall und kein externer Nachweis.

### Operator: Browserlauf „Balance wealth history“ außerhalb der Sandbox, zweiter Versuch, am 2026-10-02

- Datum: `2026-10-02T23:04:27+02:00` (Europe/Berlin).
- Rolle: Operator (Steuerung durch Claude Code im Auftrag des Nutzers).
- Ausführungsumgebung: außerhalb der Agentensandbox; WSL2 Ubuntu (Linux 6.6.87.1-microsoft-standard-WSL2), Node.js `v22.23.2`, Playwright mit installiertem Chromium (headless).
- Geprüfter Stand: Branch `feature/vermoegensverlauf`, `git rev-parse HEAD`: `6e4695b8ac47577506d7cda04ba0a515cbb1a660`; Arbeitsbaum nach Layout- und Tabkorrektur (Dateien seitdem unverändert, Hashes am 2026-10-02T23:06 erneut bestätigt).
- SHA-256 `app/balance/balance-wealth-history-renderer.js`: `848e6fb5fa92734eb3b175a41a390154fcd9264c68094d4bb259a55d000e4aa6`.
- SHA-256 `tests/balance-wealth-history-chart.test.mjs`: `732b3c56ccfab632bf1a8f63340a2d7c7ed514aba1fc0ceab2ef5a3afa134b2a`.
- SHA-256 `tests/browser-smoke.test.mjs`: `e6fce88f47e41749b52f7a840dd479cde38b89ba46cbfce34129792d1ac8c5bd`.
- Zusätzlich SHA-256 `css/balance.css`: `4062164ac7eb042d557cbaaab42d7adc7e610a8f25be6ea80cfc94e3402c6b8f`.
- Exakter Testbefehl: `node tests/browser-smoke.test.mjs --only='Balance wealth history'`.
- Tatsächlicher Exitcode: `0`.
- Abschlussmeldung: `Browser smoke passed: Balance wealth history`.
- Bewertung: **Bestanden.**

### Operator: Browserlauf „Balance annual commit“ außerhalb der Sandbox, zweiter Versuch, am 2026-10-02

- Datum: `2026-10-02T23:04:31+02:00` (Europe/Berlin).
- Rolle: Operator (Steuerung durch Claude Code im Auftrag des Nutzers).
- Ausführungsumgebung: außerhalb der Agentensandbox; WSL2 Ubuntu (Linux 6.6.87.1-microsoft-standard-WSL2), Node.js `v22.23.2`, Playwright mit installiertem Chromium (headless).
- Geprüfter Stand: Branch `feature/vermoegensverlauf`, `git rev-parse HEAD`: `6e4695b8ac47577506d7cda04ba0a515cbb1a660`; Arbeitsbaum nach Layout- und Tabkorrektur (Dateien seitdem unverändert, Hashes am 2026-10-02T23:06 erneut bestätigt).
- SHA-256 `app/balance/balance-wealth-history-renderer.js`: `848e6fb5fa92734eb3b175a41a390154fcd9264c68094d4bb259a55d000e4aa6`.
- SHA-256 `tests/balance-wealth-history-chart.test.mjs`: `732b3c56ccfab632bf1a8f63340a2d7c7ed514aba1fc0ceab2ef5a3afa134b2a`.
- SHA-256 `tests/browser-smoke.test.mjs`: `e6fce88f47e41749b52f7a840dd479cde38b89ba46cbfce34129792d1ac8c5bd`.
- Zusätzlich SHA-256 `css/balance.css`: `4062164ac7eb042d557cbaaab42d7adc7e610a8f25be6ea80cfc94e3402c6b8f`.
- Exakter Testbefehl: `node tests/browser-smoke.test.mjs --only='Balance annual commit'`.
- Tatsächlicher Exitcode: `0`.
- Abschlussmeldung: `Browser smoke passed: Balance annual commit`.
- Bewertung: **Bestanden.**
- Korrektur der Operator-Einordnung vom ersten Versuch: Die Gegenprobe auf `main` lief mit der dort vorhandenen älteren Fassung dieses Browserfalls; dieser Zweig hat den Fall erweitert. Der erste Fehlschlag war daher kein belegter Rückschritt der App, sondern lag am erweiterten Testablauf; die Tabkorrektur hat ihn behoben.

### Frühere offene Voraussetzung nach Layout- und Tabkorrektur (vor Eintragung der zweiten Operator-Läufe)

Die freigegebene Umfangserweiterung ist umgesetzt. Der gezielte Unit-Test besteht auf dem aktuellen Stand mit 77/77 Assertions. Beide eigenen Browserläufe scheitern erneut mit Exitcode 1 an der Sandbox-Portgrenze. Die volle Standardsuite wurde vom Implementierer nicht ausgeführt; sie bleibt Aufgabe des Orchestrators. Die externen Fehlerläufe stammen von der früheren Fassung; zwei externe Erfolgsnachweise zum aktuellen Stand fehlen weiterhin.

Der aktuelle Halt ist deshalb `OPERATOR-PREREQUISITE-MISSING`, nicht mehr `SCOPE-EXTENSION-REQUESTED`. Der Operator muss auf dem unveränderten korrigierten Stand außerhalb der Agentensandbox beide Befehle erneut ausführen: `node tests/browser-smoke.test.mjs --only='Balance wealth history'` und `node tests/browser-smoke.test.mjs --only='Balance annual commit'`. Für jeden Lauf sind Datum, Rolle, externe Ausführungsumgebung, HEAD, die aktuellen drei Quell-/Testdateihashes, exakter Befehl, tatsächlicher Exitcode und Abschlussmeldung beziehungsweise konkrete Fehlermeldung als neuer Eintrag zu dokumentieren. Zusätzlich kann der CSS-Hash oben zur Bindung des Layoutstands übernommen werden. Erst zwei Einträge mit Exitcode 0 und den jeweiligen Abschlussmeldungen `Browser smoke passed: Balance wealth history` und `Browser smoke passed: Balance annual commit` sowie passenden Dateihashes erfüllen das zusätzliche Browsergate. Danach den Slice über den Orchestrator fortsetzen lassen; bis dahin keine Fertigmeldung.

### Implementierer: Erneute Stand- und Nachweisprüfung am 2026-10-02

- Datum der Standprüfung: `2026-10-02T23:05:24+02:00` (Europe/Berlin).
- Rolle und Ausführungsumgebung: Implementierer (Codex), Linux-Agentensandbox im Repository.
- Geprüfter Stand: Branch `feature/vermoegensverlauf`, HEAD `6e4695b8ac47577506d7cda04ba0a515cbb1a660`; unveränderter Quell-/Test- und CSS-Stand nach Layout- und Tabkorrektur.
- Mit `sha256sum` nachgerechnet: Renderer `848e6fb5fa92734eb3b175a41a390154fcd9264c68094d4bb259a55d000e4aa6`, Diagramm-Unit-Test `732b3c56ccfab632bf1a8f63340a2d7c7ed514aba1fc0ceab2ef5a3afa134b2a`, Browsertest `e6fce88f47e41749b52f7a840dd479cde38b89ba46cbfce34129792d1ac8c5bd`, CSS `4062164ac7eb042d557cbaaab42d7adc7e610a8f25be6ea80cfc94e3402c6b8f`. Alle Werte stimmen mit den oben dokumentierten eigenen Läufen nach der Korrektur überein.
- Der Quelldiff bestätigt die getrennten ARIA-Referenzen, die vollständigen Unit-Attributprüfungen und den vollständigen Beschreibungstext im Browserhelfer. Exakte Rollen-/Namenssuche, Einzeltrefferprüfung und bestehende Folgeassertions sind erhalten. `git diff --check` endet mit Exitcode `0` ohne Ausgabe.
- Keine neuen Produkt-/Teständerungen oder erneuten Testläufe bei dieser Wiederaufnahme. Die gültige Unit-Evidenz und beide tatsächlichen Sandboxfehler bleiben oben dokumentiert; die volle Standardsuite bleibt dem Orchestrator vorbehalten.
- Es wurden keine neuen externen Operator-Erfolgsnachweise eingetragen. Die einzigen beiden Operator-Läufe auf dem Featurebranch haben Exitcode `1` und gehören zum früheren Browsertesthash `6ebe7d6af9bb14450adc3eccd21d3be0b39101b31b3568cc82cb14fa15fa3ec5`. Die erfolgreiche Gegenprobe auf `main` belegt nicht den aktuellen Featurestand. Das zusätzliche Browsergate ist weiterhin unerfüllt; der Halt bleibt `OPERATOR-PREREQUISITE-MISSING`. Erforderlich sind die zwei oben benannten externen Läufe samt vollständigen, zum aktuellen Stand passenden Erfolgsnachweisen im Prüfprotokoll.

### Implementierer: Wiederaufnahme mit gültigen externen Erfolgsnachweisen am 2026-10-02

- Datum der Stand- und Nachweisprüfung: `2026-10-02T23:07:25+02:00` (Europe/Berlin).
- Rolle und Ausführungsumgebung: Implementierer (Codex), Linux-Agentensandbox im Repository.
- Geprüfter Stand: Branch `feature/vermoegensverlauf`, HEAD `6e4695b8ac47577506d7cda04ba0a515cbb1a660`; unveränderter Quell-/Test- und CSS-Stand nach Layout- und Tabkorrektur.
- Mit `sha256sum` nachgerechnet: Renderer `848e6fb5fa92734eb3b175a41a390154fcd9264c68094d4bb259a55d000e4aa6`, Diagramm-Unit-Test `732b3c56ccfab632bf1a8f63340a2d7c7ed514aba1fc0ceab2ef5a3afa134b2a`, Browsertest `e6fce88f47e41749b52f7a840dd479cde38b89ba46cbfce34129792d1ac8c5bd`, CSS `4062164ac7eb042d557cbaaab42d7adc7e610a8f25be6ea80cfc94e3402c6b8f`. Diese Werte stimmen vollständig mit beiden vom Operator eingetragenen zweiten Browserläufen überein.
- Beide externen Einträge enthalten Datum, Operatorrolle, Ausführungsumgebung außerhalb der Agentensandbox, Branch und HEAD, die drei erforderlichen Dateihashes sowie zusätzlich den CSS-Hash, den exakten jeweiligen `--only`-Befehl, Exitcode `0` und die Abschlussmeldung `Browser smoke passed: Balance wealth history` beziehungsweise `Browser smoke passed: Balance annual commit`. Das zusätzliche Browsergate ist damit erfüllt. Die vorherigen Fehlerläufe bleiben als historische Evidenz erhalten.
- Der Quelldiff bestätigt `role="img"`, ausschließlich `aria-labelledby="wealthChartTitle"` und separat `aria-describedby="wealthChartDesc"` sowie den unveränderten vollständigen Titel und Beschreibungstext. Der Unit-Test prüft die vollständigen Attributwerte am öffnenden SVG-Tag. Der Browserhelfer behält die exakte Rollen-/Namenssuche und genau einen Treffer bei und prüft die separate Beschreibungsreferenz mit vollständigem Text. Sämtliche vorhandenen Folgeassertions sind erhalten; die Tabnavigation ergänzt lediglich die notwendigen Bedienungsschritte.
- Keine neuen Produkt-/Teständerungen oder erneuten Testläufe bei dieser Wiederaufnahme. Der gezielte Unit-Lauf vom `2026-10-02T23:01:27+02:00` mit Exitcode `0` und 77/77 Assertions sowie beide eigenen Sandboxversuche auf demselben Stand bleiben gültig dokumentiert. Die Sandboxfehler sind weiterhin keine bestandenen Browserfälle; die externen Erfolge stammen vom Operator.
- Alle SOURCE-Akzeptanzkriterien des Slice sind erfüllt. Der bisherige Voraussetzungshalt ist aufgehoben; die Umsetzung ist bereit für die Validierung und unabhängige Prüfung durch den Orchestrator. Die volle Standardsuite wurde vom Implementierer nicht ausgeführt; Freigabe und Abschlussmerge bleiben den dafür zuständigen Rollen vorbehalten.

## Orchestrator-Prüfprotokoll

### Verlauf

<!-- audit:history:begin -->
- Runde 1: Planung · Validierung grün · Prüfurteil abgelehnt · 1 neu, 0 geschlossen.
- Runde 2: Planrevision · Validierung grün · Prüfurteil freigegeben · 0 neu, 1 geschlossen.
<!-- audit:history:end -->

### Befunde

<!-- audit:findings:begin -->
### R-01 – Der Nachweispfad für die beiden Browserläufe ist im Plan nicht ausführbar

Klasse: Befund · Stand: geschlossen

Befund:
> Der Nachweispfad für die beiden Browserläufe ist im Plan nicht ausführbar. Slice 1 verlangt als SOURCE-Kriterium, dass das Prüfprotokoll in docs/internal/vermoegensverlauf-followup01-arbeitsplan.md für `--only='Balance wealth history'` und `--only='Balance annual commit'` Datum, Rolle, Stand, Befehl, Exitcode 0 und Abschlussmeldung enthält. Eintragen sollen diese Evidenz aber „Orchestrator oder zugewiesener Prüfer“. Laut AGENTS.md arbeiten Prüfer und Finalprüfer nur lesend und können das Dokument nicht ändern. Der Orchestrator führt nach einem Slice nur `npm test` aus, und das enthält das Browsergate nicht. Dem Implementierer ist der Browserstart in der Sandbox gegebenenfalls nicht möglich, und der Plan erklärt das ausdrücklich als „kein Stoppgrund“. Damit hat keine Rolle im orchestrierten Ablauf sowohl die Fähigkeit als auch den Auftrag, die verlangten Einträge zu erzeugen. Der Slice-Review müsste dann entweder ein nicht erfüllbares SOURCE-Kriterium ablehnen (Endlosschleife) oder ohne Beleg freigeben. Das ist genau der Mangel, den Befund 1 des Abnahmereviews rügt („ein Lauf … ist im Snapshot nicht dokumentiert“). Der Plan bildet ihn erneut ab, statt ihn zu schließen.

Akzeptanztest:
> Der Arbeitsplan legt für beide Browserläufe einen widerspruchsfreien und im orchestrierten Ablauf umsetzbaren Nachweisweg fest. Erstens: Der Implementierer versucht beide `--only`-Läufe selbst und trägt das tatsächliche Ergebnis ins Prüfprotokoll ein. Zweitens: Scheitern Server- oder Browserstart in der Sandbox, benennt der Plan den Stoppgrund, mit dem der Slice anhält (z. B. OPERATOR-PREREQUISITE-MISSING mit den Pflichtlabels oder VALIDATION-UNAVAILABLE). Er beschreibt auch, wie der Operator die Läufe außerhalb der Sandbox ausführt und im Prüfprotokoll dokumentiert. Drittens: Keine nur lesende Rolle (Prüfer/Finalprüfer) wird als Autor von Repository-Einträgen eingesetzt. Viertens: Die SOURCE-Akzeptanzkriterien von Slice 1 sind so formuliert, dass ein Slice-Review sie allein am Repositorystand beurteilen kann.

Antwort des Implementierers, Runde 1 (angenommen):
> Der Arbeitsplan verlangt beide eigenen Browserversuche samt Ergebnisprotokoll, benennt bei fehlenden externen Nachweisen OPERATOR-PREREQUISITE-MISSING mit Pflichtlabels und weist externe Ausführung und Dokumentation dem Operator zu. Prüfer bleiben lesend; die SOURCE-Kriterien sind am Repositorystand prüfbar.

Abschlussbegründung des Prüfers:
> Der überarbeitete Arbeitsplan erfüllt alle vier Teile von R-01. (1) Schritt 2 verpflichtet den Implementierer, beide `--only`-Läufe unabhängig voneinander selbst zu versuchen und jeden Versuch mit Stand, Dateihashes, Exitcode und Meldung oder Fehler ins Prüfprotokoll einzutragen. (2) Schritt 4 legt fest: Fehlen externe Erfolgsnachweise, hält der Slice mit OPERATOR-PREREQUISITE-MISSING an. Die drei Pflichtlabels sind jeweils genau einmal vorgegeben, und als remediation_paths ist nur der Plan genannt. Die Schritte 5 und 6 beschreiben, wie der Operator außerhalb der Sandbox ausführt, einträgt und die Wiederaufnahme auslöst, sowie den Hashabgleich bei der Wiederaufnahme. (3) Prüfer und Finalprüfer sind ausdrücklich nur lesend; Autoren der Protokolleinträge sind allein Implementierer und Operator. (4) Die SOURCE-Kriterien beziehen sich auf Quelltext, Testquelltext und gespeichertes Prüfprotokoll. Die Prüfgrenze stellt klar, dass ein Slice-Prüfer weder etwas ausführen noch schreiben muss. Die Abweichung von der allgemeinen Sandbox-Regel aus AGENTS.md ist begründet und auf dieses Browsergate begrenzt.
<!-- audit:findings:end -->

### Abschlussprüfung

<!-- audit:approval:begin -->
Geprüft:
> Geprüft wurden: Abdeckung der Abnahmekriterien von Befund 1 (aria-labelledby nur Titel-ID, aria-describedby, Unit-Assertion auf exakte Werte, zwei externe `--only`-Läufe mit exit=0 und Dokumentation), Rollen- und Schreibrechte gemäß AGENTS.md, Stoppregeln samt Pflichtlabels, Pfadumfang des künftigen Slice (vier exakte Pfade inklusive Plan), Wiederaufnahme und Idempotenz (Standbindung über HEAD und drei Dateihashes, kein Überschreiben früherer Fehlerläufe) sowie die PLAN_ONLY-Grenze (Diff ändert nur den Planpfad, Attestierung internal:work-plan-contract PASS).

Größtes Restrisiko:
> Das Verfahren hängt von manuellen Operator-Einträgen im Planprotokoll ab. Der Slice-Prüfer kann die angegebenen SHA-256-Werte nur gegen den Repositorystand plausibilisieren, aber nicht selbst nachrechnen; die Echtheit der Operatorläufe beruht damit auf Vertrauen. Zusätzlich nennt der Plan den Referenzcommit a942453…, während die Anfrage auf base_commit 2e70ac6… verweist. Das betrifft nur die Herkunftsangabe, nicht den Korrekturvertrag.

Bruchbedingung:
> Der Plan wäre widerlegt, wenn der Orchestrator Änderungen des Operators am Plandokument während eines angehaltenen Slice als UNEXPECTED-PATH oder Fremdänderung verwirft. Ebenso, wenn die Wiederaufnahme nach OPERATOR-PREREQUISITE-MISSING den Slice nicht mit dem vorhandenen Arbeitsbaum fortsetzt, sodass die externen Einträge verloren gehen oder nicht in den Slice-Diff gelangen.

Vorab-Risikoanalyse:
> Scheitert die Umsetzung, dann vermutlich an einer von drei Stellen. Erstens erwartet der Operator den Halt nicht und trägt die Läufe nicht im verlangten Format ein, sodass der Slice wiederholt anhält. Zweitens weicht der vollständige Beschreibungstext in der Browserassertion durch Whitespace oder Entities von textContent() ab. Drittens werden nach dem externen Lauf noch Test- oder Rendererdateien geändert, ohne die Nachweise zu erneuern. Der Plan sieht für den dritten Fall einen Hashabgleich und eine Erneuerung vor, für die ersten beiden konkrete Pflichtfelder und Abschlussmeldungen.
<!-- audit:approval:end -->
