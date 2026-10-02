# Arbeitsplan: Engine-Build in Doku und Agentenregeln richtigstellen

## Auftrag und Ausführungsgrenze

Zielbranch: `feature/engine-build-doku`.

Planungsgrundlage: Quellstand `ab0c4c70014062d1bee9df8033b964c78fcce77b`, am 2026-10-02 lesend geprüft. Der Zielbranch ist bereits ausgecheckt und entspricht dem Auftrag.

Dieser Planungsschritt schreibt ausschließlich diese Arbeitsplandatei. Die unten beschriebenen Slices sind zukünftige Umsetzungspakete und werden erst durch einen gesonderten Umsetzungsauftrag ausführbar. In diesem Schritt werden keine Produktdateien, Tests, Konfigurationen oder generierten Artefakte geändert und keine Builds oder Testläufe durchgeführt. Branchwechsel, Staging, Commits, Push und Merge bleiben dem Orchestrator beziehungsweise dem Nutzer vorbehalten.

Ziel der Umsetzung ist eine zutreffende Beschreibung des bestehenden Engine-Ladepfads und ein automatischer Schutz gegen ein unbemerkt eingechecktes Bundle. Engine-Semantik und öffentliche Schnittstellen bleiben unverändert. Insbesondere bleiben `engine.js`, `build-engine.mjs`, `package.json`, Laufzeitmodule, `dist/` und alle Dateien unter `docs/internal/archive/` unverändert. Der belegte Bestand benötigt keine Anpassung des Build-Skripts.

## Geprüfter Repositorybestand

- `package.json` definiert `build:engine` als `node build-engine.mjs` und `build:engine:strict` als Aufruf mit `ENGINE_BUILD_STRICT='1'`. `esbuild` ist keine deklarierte Abhängigkeit; ein lesender Importversuch in der aktuellen Umgebung endet mit `ERR_MODULE_NOT_FOUND`.
- `engine.js` enthält ausschließlich den generierten Modul-Wrapper: Import von `EngineAPI` aus `./engine/index.mjs`, Zuweisungen an `window.EngineAPI` und den Legacy-Alias `window.Ruhestandsmodell_v30` bei vorhandenem `window` sowie die beiden benannten Exporte. Der Wrapper enthält keine kopierte Engine-Implementierung.
- `engine/index.mjs` reexportiert die API aus `engine/core.mjs`. Fachliche Änderungen unter `engine/` werden somit über den bestehenden Importpfad geladen, ohne den unveränderten Wrapper erneut zu erzeugen.
- `build-engine.mjs` versucht zuerst einen echten IIFE-Build mit `esbuild`, `engine/index.mjs` als Einstieg und `RuhestandEngineBundle` als globalem Bundlenamen. Der Footer stellt `globalThis.EngineAPI` und den Legacy-Alias bereit. Fehlt `esbuild`, schreibt der nicht strikte Aufruf den konstanten Wrapper; andere Buildfehler werden nicht durch einen erfolgreichen Fallback verdeckt.
- Strict-Modus ist bei `ENGINE_BUILD_STRICT=1` oder `true` sowie bei `CI=1` oder `true` aktiv, jeweils unabhängig von Groß-/Kleinschreibung. Ohne `esbuild` endet der Build dann mit Fehler, bevor der Fallback geschrieben wird. Auch ein normales `build:engine` kann deshalb in CI strikt sein.
- `Balance.html` und `Simulator.html` laden `engine.js` mit `type="module"`. Zahlreiche Fachtests, etwa `tests/core-engine.test.mjs`, und Worker wie `workers/mc-worker.js` importieren `engine/index.mjs` direkt. Damit wäre ein veraltetes Bundle durch die bisherigen Fachtests allein nicht zuverlässig erkannt.
- `scripts/sync-dist.mjs` kopiert Laufzeitdateien aus genau einem Git-Commit, einschließlich des Verzeichnisses `engine/` und der Root-Datei `engine.js`; es ruft den Engine-Generator nicht auf. Ohne `--rev` gelten seine bestehenden Anforderungen an einen sauberen, versionierten Laufzeitstand. `build:desktop` führt Sync und Tauri-Build aus, keinen zusätzlichen Engine-Build.
- `tests/run-tests.mjs` entdeckt automatisch Dateien mit der Endung `.test.mjs`. Neue Tests können die zählbaren globalen Assertions `assert` und `assertEqual` nutzen und benötigen keine Änderung an Runner oder Package-Skripten. `tests/run-single.mjs` akzeptiert auch einen absoluten Testdateipfad.
- Neben den acht im Auftrag genannten Dokumenten enthält die aktive `docs/internal/PROJEKTUEBERSICHT.md` verpflichtende Builds nach Engine-Änderungen. Sie gehört deshalb zum künftigen Doku-Abgleich. `CLAUDE.md` und `GEMINI.md` enthalten bislang keine entsprechende Detailregel; dort wird die gemeinsame Regel knapp ergänzt. Der zutreffende historische Strict-Mode-Eintrag in `CHANGELOG.md` benötigt keine Änderung.
- Der Arbeitsbaum enthält zu Beginn dieses Planungsschritts ausschließlich die bereits vorhandene, unversionierte Arbeitsplandatei als sichtbare Änderung. Sie wird innerhalb des freigegebenen Pfads aktualisiert; außerhalb dieses Pfads erfolgt keine Änderung.

## Verbindliche fachliche Entscheidung

Der neue Test schützt ausdrücklich den aktuellen Wrapperbetrieb. Er behauptet keine Aktualitätsprüfung eines echten Bundles und benötigt weder `esbuild` noch Netz, Browser oder einen Build. Ein echtes Bundle muss den Test auch dann scheitern lassen, wenn es frisch erzeugt wurde. Ein späterer bewusster Wechsel zu Bundles benötigt eine eigene geprüfte Änderung des Schutzvertrags, beispielsweise einen nachvollziehbaren Aktualitätsnachweis für das Bundle; der Test darf hierfür nicht still abgeschwächt oder übersprungen werden.

Für die Dokumentation gilt folgende gemeinsame Regel:

1. Änderungen an Engine-Fachmodulen oder an der über denselben Einstieg exportierten `EngineAPI` erfordern im aktuellen Wrapperbetrieb keinen Neuaufbau von `engine.js`. Fachliche Tests und Vertragsprüfungen bleiben verpflichtend; die Zuständigkeit für die volle Suite im orchestrierten Lauf bleibt beim Orchestrator.
2. Eine Neuerzeugung ist erforderlich, wenn das generierte Artefakt fehlt oder der Generator, Import-Einstieg beziehungsweise Wrapper-/Global-/Exportvertrag geändert werden. `engine.js` wird weiterhin niemals manuell gepflegt. Bloße Änderungen an Implementierung, Versionswerten oder API-Methoden hinter demselben Import sind kein solcher Anlass.
3. `build:engine` erzeugt ohne verfügbares `esbuild` im nicht strikten Modus den konstanten Modul-Wrapper, mit `esbuild` dagegen ein echtes IIFE-Bundle. Ein Bundle enthält eine Kopie der Engine und müsste nach Änderungen seiner Quellen neu gebaut werden. Dieses Verhalten ist vom heutigen geprüften Wrapperbetrieb zu unterscheiden.
4. `build:engine:strict` ist ein bewusst gewähltes Gate für einen Auslieferungspfad, der tatsächlich ein Bundle verlangt. Es verhindert einen stillen Fallback bei fehlendem Bundler. Es ist keine allgemeine Pflicht für Tests, Wrapperbetrieb oder den bestehenden Browser-/Tauri-Auslieferungspfad. Die Strict-Aktivierung durch die Umgebungsvariablen ist ausdrücklich zu dokumentieren.
5. Browserbetrieb benötigt beim Wrapper die Module unter `engine/`; Desktop-Sync liefert sie zusammen mit `engine.js` aus dem ausgewählten Commit mit. Ein unveränderter Wrapper bedeutet deshalb keine veraltete Engine.

## Geordnete zukünftige Umsetzung

### Slice 1 - Wrappervertrag automatisch absichern

**Ziel**

Eine zusätzliche Standardsuite-Prüfung verhindert, dass eingebettete Engine-Logik den heutigen direkten Modul-Ladepfad unbemerkt ersetzt.

**Exakter Änderungspfad**

- `tests/README.md`
- `tests/engine-wrapper-contract.test.mjs`

**Umsetzung**

- Neue Testdatei im vorhandenen Runnerstil anlegen. `engine.js` ausschließlich lesend über einen aus `import.meta.url` abgeleiteten Pfad öffnen, damit der Aufruf unabhängig vom Arbeitsverzeichnis funktioniert.
- Den vollständigen bekannten Wrapper als unabhängigen erwarteten Text im Test festlegen und den tatsächlichen Inhalt mit ihm vergleichen. Ausschließlich CRLF zu LF normalisieren, um Windows-Checkouts zu unterstützen; keine allgemeine Inhaltsbereinigung oder Teilstringprüfung verwenden. Damit werden zusätzliche ausführbare Anweisungen, entfernte Exporte, geänderte Importziele und eingebettete Bundles abgewiesen, auch wenn Header und Importzeile erhalten bleiben.
- Zählbare globale Assertions verwenden. Eine verständliche Fehlermeldung benennt `engine.js`, den erwarteten reinen Wrapper und die notwendige Prüfung eines bewussten Bundlewechsels. Den erwarteten Text nicht aus der gerade geprüften Datei ableiten und das Build-Skript nicht ausführen oder importieren.
- In `tests/README.md` den Schutzzweck, die automatische Entdeckung durch `npm test`, den Fokusbefehl und den bewussten Fehler bei Bundle-Inhalt dokumentieren. Keine pauschale Engine-Neubaupflicht hinzufügen.
- Die nachfolgenden Negativnachweise mit derselben Testdatei in einem privaten Scratch-Verzeichnis durchführen. Dafür den neuen Test nach `<scratch>/tests/engine-wrapper-contract.test.mjs` und den echten Wrapper nach `<scratch>/engine.js` kopieren. Der Originalrunner kann den kopierten Test über dessen absoluten Pfad ausführen; weitere Produktdateien oder Abhängigkeiten sind für den reinen Textvertrag nicht nötig. Keine Repositorydatei für Mutationen überschreiben.

**Akzeptanzkriterien**

1. Gegen SOURCE: `node tests/run-single.mjs tests/engine-wrapper-contract.test.mjs` endet mit Exitcode 0 und mindestens einer gezählten Assertion beim unveränderten echten Wrapper; ein Build wird dafür nicht ausgeführt.
2. Gegen SOURCE: Derselbe Test ist in einer Scratch-Kopie mit dem echten Wrapper ebenfalls grün. Eine nur auf CRLF umgestellte Kopie ist grün; damit ist die erlaubte Normalisierung belegt.
3. Gegen SOURCE: Wird ausschließlich die Scratch-Kopie von `engine.js` durch plausiblen IIFE-Bundle-Inhalt mit eigener API-Implementierung ersetzt, endet derselbe Test mit einem Nichtnull-Exitcode aufgrund der Wrappervertrags-Assertion. Ein Import-, Runner- oder Abhängigkeitsfehler zählt nicht als Mutationsnachweis.
4. Gegen SOURCE: Bleibt der echte Wrapper in der Scratch-Kopie vollständig erhalten und wird zusätzlicher ausführbarer Bundle-/API-Code angehängt, scheitert derselbe Test ebenfalls an der Vertrags-Assertion. Eine bloße Suche nach Header, Import oder Dateigröße reicht damit nicht als Prüfung.
5. Gegen SOURCE: Nach erneuter Übernahme des echten Wrappers in die Scratch-Kopie ist derselbe Test wieder grün. Das Repository-`engine.js` bleibt während aller Nachweise unverändert; Ausgangs-, Mutations- und Wiederherstellungsergebnisse werden getrennt berichtet.
6. Gegen SOURCE: Der Orchestrator führt nach dem Slice `npm test` aus; die neue Testdatei wird automatisch mit gezählten Assertions ausgeführt, und die Gesamtsuite ist grün. Test-Runner, `package.json`, Engine-Logik, Generator und generiertes Artefakt bleiben unverändert.

**Fokussierte Validierung**

```bash
node tests/run-single.mjs tests/engine-wrapper-contract.test.mjs
```

Für jeden Scratch-Zustand denselben Runner mit dem absoluten Pfad der kopierten Testdatei aufrufen. Den grünen Originalzustand, CRLF, Bundle-Ersatz, angehängten Code und die grüne Wiederherstellung samt Exitcodes protokollieren. Diese gezielten Läufe ersetzen nicht die Standardsuite des Orchestrators. Die Scratch-Mutationen sind Validierungsfixtures und keine zusätzlichen Änderungspfade des Slices.

Die Scratch-Kopie muss dieselbe relative Struktur `tests/engine-wrapper-contract.test.mjs` und `engine.js` erhalten. Dafür den bereitgestellten privaten Scratch-Ordner verwenden, keine Checkout-Dateien ersetzen und weder den Generator noch ein echtes Bundle ausführen. Den IIFE-Ersatz als synthetischen Text schreiben, beispielsweise `(() => { globalThis.EngineAPI = { simulateSingleYear() { return {}; } }; })();`. Weil der Test den Inhalt nur liest, ist dessen Ausführbarkeit kein Teil des Nachweises; maßgeblich ist die gezählte fehlgeschlagene Wrapper-Assertion.

### Slice 2 - Aktive Dokumentation und Agentenregeln vereinheitlichen

**Ziel**

Alle aktiven Arbeitsanweisungen beschreiben den geprüften Modulbetrieb, die tatsächlichen Generatorvarianten und den bedingten Zweck des Strict-Builds ohne verpflichtende Neuaufbauten nach jeder Engine-Änderung.

**Exakter Änderungspfad**

- `AGENTS.md`
- `CLAUDE.md`
- `CODEX.md`
- `GEMINI.md`
- `README.md`
- `docs/internal/PROJEKTUEBERSICHT.md`
- `docs/reference/ARCHITEKTUR_UND_FACHKONZEPT.md`
- `docs/reference/TECHNICAL.md`
- `engine/README.md`

**Umsetzung**

- Die gemeinsame Regel aus dem Abschnitt „Verbindliche fachliche Entscheidung“ in `AGENTS.md` und `CODEX.md` an den bestehenden Implementierungs-/Ausführungs- und Validierungsstellen verankern. Die Aufforderung, nach jeder Engine- oder API-Änderung neu zu bauen, entfernen; fachliche Testpflichten erhalten.
- In `CLAUDE.md` und `GEMINI.md` die passende Reviewregel ergänzen: Ein unveränderter reiner Wrapper ist nach Engine-Fachänderungen erwartbar; maßgeblich sind Modulstand, Fachtests und der neue Wrappervertrag. Bundle-/Strict-Verhalten und Neuerzeugungsanlässe konsistent mit `AGENTS.md` kurz beschreiben oder eindeutig darauf verweisen. Rollen und Freigabegrenzen bleiben erhalten.
- In `README.md` Architekturtext, Verzeichnisbaum, Entwicklungsschritte und Build-/Release-Hinweise korrigieren. In `docs/reference/TECHNICAL.md` Komponentenübersicht, Engine-Beschreibung und Wartungscheckliste angleichen. Die Engine bleibt Source of Truth unter `engine/`; `engine.js` ist aktuell ein generierter Modul-Wrapper.
- In `docs/reference/ARCHITEKTUR_UND_FACHKONZEPT.md` insbesondere Architekturübersicht, Artefaktbeschreibung, Release-Abschnitt, Engine-Einstieg und Validierungstabelle korrigieren. Strict-Build nicht als Voraussetzung des bestehenden Desktop-Pfads darstellen.
- In `engine/README.md` Einleitung, Einstiegserklärung, Build-Prozess und Entwicklungstipps synchronisieren. Das tatsächliche Verhalten mit und ohne `esbuild`, Fehlerverhalten und Strict-Umgebungsvariablen zusammenhängend erläutern; den neuen Schutztest verlinken.
- In `docs/internal/PROJEKTUEBERSICHT.md` Engine-Erklärung, Bearbeitungsregel, Kommandotabelle und Validierungs-/Risikoreduktionsregeln angleichen. Historische Nachweise in dieser Datei und `engine/README.md` dürfen erhalten bleiben, müssen aber ausdrücklich als damalige Nachweise erscheinen und dürfen keine heutige Buildpflicht begründen. Keine historischen Assertion-Zahlen als frisch gemessene Ergebnisse ausgeben.
- Alle aktiven Markdown-Dokumente nach `build:engine`, `build-engine.mjs` und Aussagen zu `engine.js` durchsuchen, nicht nur die bekannten Treffer. Zutreffende historische Aussagen bleiben erhalten. Archive, Intake-/Ausgabeverzeichnisse, Agentenmetadaten, Abhängigkeiten und generierte Verzeichnisse aus der aktiven Suche ausnehmen. Dieser Arbeitsplan enthält bewusst historische Befundbeschreibungen, die von aktuellen Handlungsanweisungen zu unterscheiden sind.

**Akzeptanzkriterien**

1. Gegen SOURCE: Alle acht im Auftrag genannten Dokumente sowie `docs/internal/PROJEKTUEBERSICHT.md` beschreiben konsistent den aktuellen reinen Modul-Wrapper und die direkte Verwendung der Engine-Module. Kein aktiver normativer Text verlangt allein wegen Änderungen unter `engine/` oder an API-Methoden einen Neuaufbau oder eine Größen-/Bundlekontrolle von `engine.js`.
2. Gegen SOURCE: Die aktive Doku unterscheidet Neuerzeugungsanlässe des Wrappers von normalen Engine-Fachänderungen sowie den konstanten Fallback ohne `esbuild` vom echten IIFE-Bundle mit `esbuild`. Sie erklärt, dass echte Bundles Quelländerungen nicht automatisch übernehmen und vom neuen Wrappertest abgewiesen werden.
3. Gegen SOURCE: `build:engine:strict` ist als optionaler, bewusst gewählter Bundle-Auslieferungsvertrag beschrieben. Fehlendes `esbuild` führt dort zum Fehler; auch `ENGINE_BUILD_STRICT` und `CI` können den normalen Build strikt machen. Der vorhandene Browser-/Tauri-Wrapperpfad wird nicht fälschlich von einem Strict-Build abhängig gemacht.
4. Gegen SOURCE: Die Packaging-Erklärung hält fest, dass `scripts/sync-dist.mjs` `engine/` und `engine.js` aus demselben gewählten Commit übernimmt und keinen Engine-Build ausführt. Bestehende Sauberkeits-/Versionierungs- und Testanforderungen werden nicht abgeschwächt.
5. Gegen SOURCE: Eine repositoryweite Suche in aktiver Markdown-Doku liefert nur fachlich zutreffende aktuelle Aussagen beziehungsweise klar gekennzeichnete historische Befunde zu `build:engine`. Alle Treffer werden inhaltlich bewertet; ein Nulltreffer ist nicht das Ziel. Regeln in `AGENTS.md`, `CODEX.md`, `CLAUDE.md` und `GEMINI.md` widersprechen einander nicht.
6. Gegen SOURCE: Der Fokuslauf des neuen Tests bleibt grün und der Orchestrator führt anschließend `npm test` erfolgreich aus. `engine.js`, `build-engine.mjs`, Engine-Logik, Konfigurationen und Archive sind gegenüber dem Ausgangsstand unverändert; es gibt keine Änderungen außerhalb der freigegebenen Umsetzungspfade.

**Fokussierte Validierung**

```bash
rg -n 'build:engine|build-engine\.mjs|engine\.js' --glob '*.md' --glob '!docs/internal/archive/**' --glob '!inbox/**' --glob '!outbox/**' --glob '!node_modules/**' --glob '!dist/**' --glob '!.orchestrator/**' --glob '!.agents/**' --glob '!.codex/**' --glob '!.claude/**' --glob '!.gemini/**' .
node tests/run-single.mjs tests/engine-wrapper-contract.test.mjs
git diff --check
git diff --name-only
```

Die Suchtreffer mit den tatsächlichen Quellen `package.json`, `build-engine.mjs`, `engine.js`, `engine/index.mjs` und `scripts/sync-dist.mjs` abgleichen. Für Änderungen im Fachkonzept zusätzlich den bestehenden fokussierten Dokumentationsvertrag mit `node tests/run-single.mjs tests/architecture-evidence.test.mjs` prüfen, damit lokale Links und Anker erhalten bleiben. Ein Build, Browser-Smoke oder Desktop-Build ist für diese Änderungen nicht erforderlich.

## Risiken und Abschlussnachweis

- Ein installierter Bundler kann schon beim normalen `build:engine` den Wrapper durch ein Bundle ersetzen. Die Doku muss dies erklären; die Testfehlermeldung soll den dadurch ausgelösten Vertragswechsel sichtbar machen. Für die geplante Umsetzung `build:engine` nicht vorsorglich ausführen und `esbuild` nicht nachinstallieren.
- Der vollständige Textvertrag ist absichtlich streng. Ein künftiger legitimer Adapterwechsel benötigt einen gemeinsamen Review von Generator, erzeugtem Artefakt und Test-Erwartung. Eine beliebige API-Implementierung oder zusätzlicher Code darf nicht aufgrund eines erhaltenen Imports akzeptiert werden.
- Plattformbedingte Zeilenenden werden gezielt normalisiert. Keine andere Normalisierung darf Bundle- oder Zusatzcode verdecken.
- Die einzige zusätzliche aktive Doku außerhalb der acht ausdrücklich aufgezählten Dateien ist die belegte Projektübersicht. Sollte die spätere Umsetzung weitere normative Widersprüche außerhalb der exakten Slice-Pfade entdecken, ist zunächst eine Scope-Anpassung durch den Orchestrator nötig; die aktuelle Planung schreibt dort nichts.
- Der Abschlussbericht nennt geänderte Dokumente, den neuen Test, die Mutations-Exitcodes und den vom Orchestrator belegten grünen Gesamtlauf. Nicht ausgeführte Prüfungen werden nicht als grün behauptet. Ein abschließender Diff-Abgleich belegt den unveränderten Generator, Wrapper, Laufzeitcode und Archivbestand.

## Abnahme dieses Planungsschritts

Die Arbeitsplandatei ist vorhanden, nicht leer und enthält geordnete Slices ab 1, jeweils mit exakten Änderungspfaden, Umsetzungsschritten und gegen SOURCE messbaren Akzeptanzkriterien. In diesem PLAN_ONLY-Schritt wird allein diese Datei als ausführbarer Slice quittiert; zukünftige Produktslices werden nur innerhalb dieses Dokuments beschrieben.

## Orchestrator-Prüfprotokoll

### Verlauf

<!-- audit:history:begin -->
- Runde 1: Planung · Validierung grün · Prüfurteil freigegeben · 0 neu, 0 geschlossen.
- Runde 1: Halt (instance failure). Grund: role=implementer step=implementer_plan invocation=[Hash ausgelassen] kind=permission resume=manual resume required auto=false continuations=0 provider=[provider text redacted; sha256=[Hash ausgelassen]; utf8_bytes=119]
<!-- audit:history:end -->

### Befunde

<!-- audit:findings:begin -->
Keine.
<!-- audit:findings:end -->

### Abschlussprüfung

<!-- audit:approval:begin -->
Geprüft:
> Geprüft wurden: PLAN_ONLY-Vertrag (Artefakt docs/internal/engine-build-doku-arbeitsplan.md existiert laut Diff als neue Datei mit 136 Zeilen, einziger geänderter Pfad, deckt sich mit authorized_paths und plan_artifact_path); Slice-Struktur (Slice 1 und 2, Nummerierung ab 1, je exakte Änderungspfade, Umsetzung, gegen SOURCE messbare Akzeptanzkriterien, fokussierte Validierung); Abdeckung der Intake-Ziele: alle acht genannten Dokumente plus begründet docs/internal/PROJEKTUEBERSICHT.md, Erklärung von build:engine mit/ohne esbuild, build:engine:strict inklusive ENGINE_BUILD_STRICT/CI, Wrappertest mit exaktem Textvergleich (nur CRLF→LF), Negativnachweise für Bundle-Ersatz und angehängten Code sowie Wiederherstellung in einer Scratch-Kopie, ohne dass Repository-Dateien mutiert werden; Unveränderlichkeit von engine.js, build-engine.mjs, package.json, Runner und Archiven; Reihenfolge (Test vor Doku, damit die Doku auf den Test verweisen kann); Konsistenz der Agentenregeln über AGENTS/CODEX/CLAUDE/GEMINI. Die deterministische Attestierung internal:work-plan-contract passt zum Fingerprint und ist PASS (slices=1, future_slices=2).

Größtes Restrisiko:
> Die Bestandsangaben im Plan (genauer Wrapperinhalt von engine.js, Fallback-/Strict-Logik in build-engine.mjs, Kopierverhalten von scripts/sync-dist.mjs, ob run-single.mjs absolute Pfade akzeptiert, Existenz von tests/architecture-evidence.test.mjs) konnte ich in diesem Lauf nicht selbst gegen die Quelldateien abgleichen. Der Grund: Die Anfrage begrenzte mich auf genau drei Read-Aufrufe für Manifest und Request-Teile, und die Evidenz enthält nur den Plan-Diff. Der Plan verlangt aber in beiden Slices einen Abgleich mit den tatsächlichen Quellen und schließt Runner- oder Importfehler ausdrücklich als Mutationsnachweis aus. Ein falscher Bestand fiele deshalb spätestens im Slice-Review auf. Ein kleineres Risiko: Ergänzungen in AGENTS.md könnten Regeltext hinter die 12.000-Zeichen-Grenze schieben, die im Lauf gelesen wird.

Bruchbedingung:
> Der Plan wäre falsch, wenn engine.js tatsächlich nicht der reine konstante Wrapper ist, wenn build-engine.mjs ohne esbuild keinen konstanten Text schreibt, wenn run-single.mjs keine absoluten Pfade außerhalb des Repositorys ausführen kann (dann wären die Scratch-Nachweise nicht so durchführbar), oder wenn außer den neun benannten Dateien weitere aktive Markdown-Dokumente normative Build-Pflichten enthalten (dann bräuchte Slice 2 eine Scope-Erweiterung).

Vorab-Risikoanalyse:
> Mögliche Ursachen, falls die spätere Umsetzung scheitert: (1) Der exakte Erwartungstext im Test weicht in Leerzeichen oder am Dateiende-Zeilenumbruch vom tatsächlichen Wrapper ab, sodass der Test schon im Ausgangszustand rot ist. Das Akzeptanzkriterium 1 von Slice 1 fängt das ab. (2) Die Scratch-Ausführung über den Originalrunner löst die Testdatei relativ zum Repository auf statt zum Scratch-Pfad. Dann würde der Mutationsnachweis unbemerkt das echte engine.js prüfen. Die Kriterien 3 und 4 verlangen deshalb einen Fehlschlag der Vertrags-Assertion, und der Prüfer muss das an den getrennt berichteten Exitcodes kontrollieren. (3) Die Doku-Suche mit rg ist in der Sandbox nicht verfügbar. Ersatzweise wäre git grep mit denselben Ausschlüssen gleichwertig. (4) AGENTS.md wird so stark erweitert, dass Regeln hinter die 12.000-Zeichen-Grenze rutschen. Die Ergänzungen sollten knapp bleiben.
<!-- audit:approval:end -->
