# Slice 1 von 2 – Wrappervertrag automatisch absichern

<!-- audit:status:begin -->
Freigegeben in Runde 1 · 0 Befunde, 0 geschlossen · Validierung grün
<!-- audit:status:end -->

## Ziel

<!-- audit:goal:begin -->
Eine zusätzliche Standardsuite-Prüfung verhindert, dass eingebettete Engine-Logik den heutigen direkten Modul-Ladepfad unbemerkt ersetzt.
<!-- audit:goal:end -->

## Akzeptanzkriterien

<!-- audit:acceptance:begin -->
1. Gegen SOURCE: `node tests/run-single.mjs tests/engine-wrapper-contract.test.mjs` endet mit Exitcode 0 und mindestens einer gezählten Assertion beim unveränderten echten Wrapper; ein Build wird dafür nicht ausgeführt.
2. Gegen SOURCE: Derselbe Test ist in einer Scratch-Kopie mit dem echten Wrapper ebenfalls grün. Eine nur auf CRLF umgestellte Kopie ist grün; damit ist die erlaubte Normalisierung belegt.
3. Gegen SOURCE: Wird ausschließlich die Scratch-Kopie von `engine.js` durch plausiblen IIFE-Bundle-Inhalt mit eigener API-Implementierung ersetzt, endet derselbe Test mit einem Nichtnull-Exitcode aufgrund der Wrappervertrags-Assertion. Ein Import-, Runner- oder Abhängigkeitsfehler zählt nicht als Mutationsnachweis.
4. Gegen SOURCE: Bleibt der echte Wrapper in der Scratch-Kopie vollständig erhalten und wird zusätzlicher ausführbarer Bundle-/API-Code angehängt, scheitert derselbe Test ebenfalls an der Vertrags-Assertion. Eine bloße Suche nach Header, Import oder Dateigröße reicht damit nicht als Prüfung.
5. Gegen SOURCE: Nach erneuter Übernahme des echten Wrappers in die Scratch-Kopie ist derselbe Test wieder grün. Das Repository-`engine.js` bleibt während aller Nachweise unverändert; Ausgangs-, Mutations- und Wiederherstellungsergebnisse werden getrennt berichtet.
6. Gegen SOURCE: Der Orchestrator führt nach dem Slice `npm test` aus; die neue Testdatei wird automatisch mit gezählten Assertions ausgeführt, und die Gesamtsuite ist grün. Test-Runner, `package.json`, Engine-Logik, Generator und generiertes Artefakt bleiben unverändert.
<!-- audit:acceptance:end -->

## Umfang

<!-- audit:scope:begin -->
- `docs/internal/engine-build-doku-implement-review-8362ec28.md`
- `docs/internal/slice-engine-build-doku-arbeitsplan-01-wrappervertrag-automatisch-absichern.md`
- `tests/README.md`
- `tests/engine-wrapper-contract.test.mjs`
<!-- audit:scope:end -->

## Umsetzung

> - `tests/engine-wrapper-contract.test.mjs` liest `engine.js` ausschließlich als Text über `new URL('../engine.js', import.meta.url)`. Ein unabhängiger vollständiger Solltext schützt Importziel, Browser-Globals, Legacy-Alias und Exporte einschließlich des abschließenden Zeilenumbruchs. Nur CRLF wird zu LF normalisiert; eine globale, gezählte Assertion weist jede weitere Inhaltsänderung ab.
> - Die Fehlermeldung benennt den reinen Modul-Wrapper, eingebettete Engine-Logik und den notwendigen Vertragsreview bei einem bewussten Bundlewechsel. Weder Engine noch Generator werden importiert oder ausgeführt.
> - `tests/README.md` beschreibt Schutzzweck, automatische Standardsuite-Entdeckung, Fokusbefehl, erlaubte Normalisierung und bewussten Fehler bei Bundle-Inhalt. Die Neuerzeugung des Wrappers wird für Änderungen hinter demselben Import nicht verlangt.
> - Die vorhandene Slice-Datei dokumentiert Umsetzung und getrennte Nachweise. Keine Änderung an Runner, `package.json`, Generator, Engine-Logik oder generiertem Artefakt.

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
> Geprüft wurden Korrektheit, Vertragstreue, Fehlerpfade, Sicherheit, Scope und Resume/Idempotenz. Der Diff betrifft nur tests/README.md und tests/engine-wrapper-contract.test.mjs; beide liegen in der exakten Slice-Allowlist. Runner, package.json, engine/, build-engine.mjs und engine.js bleiben unverändert. Die Testdatei im Snapshot entspricht dem Diff. Sie liest engine.js über new URL('../engine.js', import.meta.url), also unabhängig vom Arbeitsverzeichnis, normalisiert ausschließlich /\r\n/g zu \n und vergleicht per strikter Gleichheit (===) mit einem fest eingebetteten Solltext. Diese Gleichheitsprüfung trägt die Mutationskriterien: Ein ersetzter IIFE-Bundle-Inhalt, ein angehängter Bundle- oder API-Code und jede sonstige Abweichung lassen genau dieses assert scheitern; das ist kein Import- oder Runnerfehler. Eine reine CRLF-Kopie bleibt grün. Der Test ist rein lesend und nutzt weder Netz noch Build; er ist idempotent. Die Attestierung validation-[Hash ausgelassen] gehört zum aktuellen Fingerprint und meldet npm test mit Exitcode 0 (184 entdeckte Testdateien). Die README-Ergänzung beschreibt Verhalten, Aufrufbefehl und den Weg für einen bewussten Vertragswechsel zutreffend.

Größtes Restrisiko:
> Im Snapshot fehlen engine.js und tests/run-tests.mjs; der Workspace enthält nur die geänderten Dateien. Zudem ist die Attestierungsausgabe in der Mitte gekürzt. Deshalb lässt sich direkt weder die FILE-RESULT-Zeile mit assertions>=1 für engine-wrapper-contract.test.mjs noch die Bereitstellung des globalen assert durch den Runner einsehen. Beides folgt nur mittelbar aus der grünen Gesamtsuite: Ein undefiniertes assert oder ein abweichendes engine.js würde die Datei fehlschlagen lassen. Fachlich bleibt ein Restrisiko: Ein künftiges npm run build:engine mit verfügbarem Bundler könnte bewusst einen roten Test erzeugen. Das ist vom freigegebenen Plan beabsichtigt und wird in Slice 2 dokumentiert.

Bruchbedingung:
> Die Freigabe wäre falsch, wenn der Runner Ausnahmen aus Top-Level-Code einer Testdatei nicht als Fehlschlag wertet. Sie wäre auch falsch, wenn er engine-wrapper-contract.test.mjs nicht entdeckt oder kein globales assert mit Assertion-Zählung bereitstellt. Ebenso wäre sie falsch, wenn das Repository-engine.js inhaltlich vom eingebetteten Solltext abweicht und die grüne Suite auf einem anderen Stand beruht als dem attestierten Fingerprint [Hash ausgelassen]…

Vorab-Risikoanalyse:
> Wahrscheinlichster Fehlschlag später: Ein Agent führt nach einer Engine-Änderung pflichtgemäß npm run build:engine aus. Der Generator erzeugt dabei ein echtes Bundle statt des Fallback-Wrappers, und die Suite wird rot. Das ist der gewollte Schutz, könnte aber als Testfehler missverstanden und durch Abschwächen des Solltexts umgangen werden. Die README hält ausdrücklich fest, dass ein Bundlewechsel eine eigene geprüfte Vertragsänderung braucht und der Test nicht still abgeschwächt werden darf. Slice 2 muss AGENTS.md und TECHNICAL.md entsprechend angleichen. Ein zweiter Fall: Ein Editor speichert engine.js mit UTF-8-BOM. Dann scheitert der Test, obwohl der Inhalt sinngleich ist; das wird mit einer klaren Assertion-Meldung sichtbar und ist vertretbar.
<!-- audit:approval:end -->

<!-- audit:reference:begin -->
Technischer Bezug: Lauf `watch-20261002-101935.640831Z-41190963141b`, Arbeitseinheit(en) 2; Nachweise in der Recordkette.
<!-- audit:reference:end -->
