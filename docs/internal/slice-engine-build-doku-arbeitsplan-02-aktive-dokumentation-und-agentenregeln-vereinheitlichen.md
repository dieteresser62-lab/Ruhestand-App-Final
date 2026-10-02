# Slice 2 von 2 – Aktive Dokumentation und Agentenregeln vereinheitlichen

<!-- audit:status:begin -->
Freigegeben in Runde 1 · 0 Befunde, 0 geschlossen · Validierung grün
<!-- audit:status:end -->

## Ziel

<!-- audit:goal:begin -->
Alle aktiven Arbeitsanweisungen beschreiben den geprüften Modulbetrieb, die tatsächlichen Generatorvarianten und den bedingten Zweck des Strict-Builds ohne verpflichtende Neuaufbauten nach jeder Engine-Änderung.
<!-- audit:goal:end -->

## Akzeptanzkriterien

<!-- audit:acceptance:begin -->
1. Gegen SOURCE: Alle acht im Auftrag genannten Dokumente sowie `docs/internal/PROJEKTUEBERSICHT.md` beschreiben konsistent den aktuellen reinen Modul-Wrapper und die direkte Verwendung der Engine-Module. Kein aktiver normativer Text verlangt allein wegen Änderungen unter `engine/` oder an API-Methoden einen Neuaufbau oder eine Größen-/Bundlekontrolle von `engine.js`.
2. Gegen SOURCE: Die aktive Doku unterscheidet Neuerzeugungsanlässe des Wrappers von normalen Engine-Fachänderungen sowie den konstanten Fallback ohne `esbuild` vom echten IIFE-Bundle mit `esbuild`. Sie erklärt, dass echte Bundles Quelländerungen nicht automatisch übernehmen und vom neuen Wrappertest abgewiesen werden.
3. Gegen SOURCE: `build:engine:strict` ist als optionaler, bewusst gewählter Bundle-Auslieferungsvertrag beschrieben. Fehlendes `esbuild` führt dort zum Fehler; auch `ENGINE_BUILD_STRICT` und `CI` können den normalen Build strikt machen. Der vorhandene Browser-/Tauri-Wrapperpfad wird nicht fälschlich von einem Strict-Build abhängig gemacht.
4. Gegen SOURCE: Die Packaging-Erklärung hält fest, dass `scripts/sync-dist.mjs` `engine/` und `engine.js` aus demselben gewählten Commit übernimmt und keinen Engine-Build ausführt. Bestehende Sauberkeits-/Versionierungs- und Testanforderungen werden nicht abgeschwächt.
5. Gegen SOURCE: Eine repositoryweite Suche in aktiver Markdown-Doku liefert nur fachlich zutreffende aktuelle Aussagen beziehungsweise klar gekennzeichnete historische Befunde zu `build:engine`. Alle Treffer werden inhaltlich bewertet; ein Nulltreffer ist nicht das Ziel. Regeln in `AGENTS.md`, `CODEX.md`, `CLAUDE.md` und `GEMINI.md` widersprechen einander nicht.
6. Gegen SOURCE: Der Fokuslauf des neuen Tests bleibt grün und der Orchestrator führt anschließend `npm test` erfolgreich aus. `engine.js`, `build-engine.mjs`, Engine-Logik, Konfigurationen und Archive sind gegenüber dem Ausgangsstand unverändert; es gibt keine Änderungen außerhalb der freigegebenen Umsetzungspfade.
<!-- audit:acceptance:end -->

## Umfang

<!-- audit:scope:begin -->
- `AGENTS.md`
- `CLAUDE.md`
- `CODEX.md`
- `GEMINI.md`
- `README.md`
- `docs/internal/PROJEKTUEBERSICHT.md`
- `docs/internal/engine-build-doku-implement-review-8362ec28.md`
- `docs/internal/slice-engine-build-doku-arbeitsplan-02-aktive-dokumentation-und-agentenregeln-vereinheitlichen.md`
- `docs/reference/ARCHITEKTUR_UND_FACHKONZEPT.md`
- `docs/reference/TECHNICAL.md`
- `engine/README.md`
<!-- audit:scope:end -->

## Umsetzung

> - Die neun aktiven Dokumente `AGENTS.md`, `CODEX.md`, `CLAUDE.md`, `GEMINI.md`, `README.md`, `docs/reference/TECHNICAL.md`, `docs/reference/ARCHITEKTUR_UND_FACHKONZEPT.md`, `engine/README.md` und `docs/internal/PROJEKTUEBERSICHT.md` beschreiben jetzt den reinen Import-Wrapper und die direkte Modulverwendung. Fach-, Versions- und API-Methodenänderungen hinter demselben Import benötigen keinen Neuaufbau; Test- und Vertragsanforderungen bleiben bestehen.
> - Neuerzeugungsanlässe sind fehlendes Artefakt oder Änderungen am Generator, Import-Einstieg oder Wrapper-/Global-/Exportvertrag. Alle Dokumente unterscheiden den konstanten nicht strikten Fallback ohne `esbuild` vom echten IIFE-Bundle mit Bundler. Bundles übernehmen Quelländerungen nicht automatisch und werden vom Wrappertest auch frisch gebaut abgewiesen; ein Wechsel benötigt eine eigene geprüfte Vertragsänderung.
> - Strict ist ein optionaler, bewusst gewählter Bundle-Auslieferungsvertrag, keine Voraussetzung des bestehenden Browser-/Tauri-Wrapperpfads. Fehlendes `esbuild` und die Aktivierung des normalen Builds durch `ENGINE_BUILD_STRICT` beziehungsweise `CI` mit `1`/`true` sind dokumentiert.
> - Die Packaging-Erklärungen halten die Übernahme von `engine/` und `engine.js` aus demselben Commit ohne Engine-Build fest. Sauberkeits-/Versionierungs- und fachliche Testpflichten wurden beibehalten. Historische Build- und Assertion-Nachweise in Engine-README und Projektübersicht sind ausdrücklich als damals gemessen gekennzeichnet.
> - Repositoryweite aktive Markdown-Suche nach `build:engine|build-engine\.mjs|engine\.js`, mit Ausschluss von Archiven, Intake/Ausgabe, Agentenmetadaten, Abhängigkeiten und generierten Verzeichnissen: Alle Treffer gegen `package.json`, `build-engine.mjs`, `engine.js`, `engine/index.mjs` und `scripts/sync-dist.mjs` bewertet. Die neun geänderten Dokumente enthalten aktuelle Regeln beziehungsweise gekennzeichnete Historie. Die unveränderten Treffer in `CHANGELOG.md` beschreiben die damalige zutreffende Strict-Härtung; `tests/README.md` beschreibt Wrappertest und historische Blob-Baselines; `SIMULATOR_MODULES_README.md` nennt zutreffend die Abhängigkeit von `EngineAPI` über `engine.js`. Arbeitsplan und Slice-1-Protokoll enthalten aktuelle Verträge beziehungsweise damalige Reviewbefunde mit Verweis auf Slice 2. Keine weitere normative Neubaupflicht außerhalb des Umfangs gefunden.
>
> ### Gezielte Implementierer-Prüfungen
>
> - `node tests/run-single.mjs tests/engine-wrapper-contract.test.mjs`: Exitcode 0, 1 Assertion bestanden, keine Fehler; kein Build ausgeführt.
> - `node tests/run-single.mjs tests/architecture-evidence.test.mjs`: Exitcode 1, 23 Assertions, davon 22 bestanden. Inhalts-, Link-, Anker- und Mutationsprüfungen sind grün; die CLI-Ausgabeprüfung scheitert, weil `spawnSync /usr/bin/node EPERM` bei der Unterprozess-Ausgabeerfassung leere Ausgaben liefert. Separater unveränderter Minimalaufruf mit Pipe bestätigt denselben Umgebungsfehler; mit geerbten Standardkanälen startet der Unterprozess. Der vollständige Test ist damit nicht als grün belegt.
> - `node scripts/check-architecture-evidence.mjs --check-date 2028-01-01`: direkt ausgeführt, erwarteter Exitcode 1 mit beiden Codes `OVERDUE_REVIEW_SCOPE` und `OVERDUE_MODEL_REVIEW`. Dieser Diagnoseaufruf ersetzt keine Freigabe des vollständigen Tests.
> - `git diff --check`: grün. Änderungspfade liegen ausschließlich im freigegebenen Umfang; Generator, Wrapper, Laufzeitcode, Konfigurationen und Archive sind gegenüber dem Ausgangscommit unverändert. `AGENTS.md` bleibt mit 11.193 Zeichen unter der 12.000-Zeichen-Grenze.
> - Keine volle Suite durch den Implementierer ausgeführt; `npm test` bleibt Aufgabe des Orchestrators. Kein Engine-, Browser- oder Desktop-Build ausgeführt.
>
> ### Historische Validierungsgrenze vor der aktualisierten Sandboxregel
>
> Die Dokumentationsumsetzung war vorhanden. Die zusätzlich verlangte vollständige Architekturvalidierung war wegen des belegten Sandboxfehlers bei der Unterprozess-Ausgabeerfassung nicht verfügbar; ein Ersatz war damals nicht freigegeben. Deshalb erfolgte die frühere Meldung mit `VALIDATION-UNAVAILABLE`, ohne eigene Freigabe. Diese historische Stoppbewertung ist durch die inzwischen geltende Sandboxregel in `AGENTS.md` überholt: Gescheiterte Unterprozessstarts werden berichtet und vom Orchestrator außerhalb der Sandbox mit `npm test` geprüft.
>
> ### Historischer Nachweis bei der vorherigen Wiederaufnahme
>
> - Zielbranch `feature/engine-build-doku` und Ausgangscommit `[Hash ausgelassen]` stimmen mit der Anfrage überein. Die vorhandenen Dokumentationsänderungen wurden gegen Generator, Wrapper, Moduleinstieg und Packaging-Skript geprüft und beibehalten.
> - Wrapper-Fokuslauf erneut grün: Exitcode 0, 1 bestandene Assertion. Architektur-Fokuslauf erneut Exitcode 1 mit 23 Assertions, davon 22 bestanden; dieselbe CLI-Ausgabeprüfung scheitert.
> - Separater `spawnSync`-Diagnoseaufruf bestätigt `spawnSync /usr/bin/node EPERM`, Status 1 und leere Standardausgabe sowie Fehlerausgabe. Der direkte Aufruf des unveränderten Validators mit `--check-date 2028-01-01` liefert erneut den erwarteten Exitcode 1 und beide Fehlercodes. Das ersetzt den vorgeschriebenen vollständigen Test nicht.
> - Aktive Markdown-Suche und Diffprüfung erneut durchgeführt: keine zusätzliche normative Neubaupflicht, `git diff --check` grün, ausschließlich freigegebene Änderungspfade. Keine Produkt-, Test-, Generator-, Konfigurations- oder Archivdateien geändert; keine volle Suite und kein Build ausgeführt.
> - Damalige Bewertung: Der Stoppgrund `VALIDATION-UNAVAILABLE` bestand weiterhin. Diese Bewertung gilt seit der aktualisierten Sandboxregel nicht mehr; die Prüfung außerhalb der Sandbox bleibt erforderlich.
>
> ### Aktueller Abschluss der Implementierung am 2026-10-02
>
> - Die vorhandene Umsetzung wurde auf dem angeforderten Zielbranch gegen `package.json`, Generator, Wrapper, Moduleinstieg und Packaging-Code geprüft und beibehalten. Die aktive Markdown-Suche wurde erneut vollständig inhaltlich bewertet; es gibt keine zusätzliche normative Neubaupflicht außerhalb des freigegebenen Umfangs.
> - `node tests/run-single.mjs tests/engine-wrapper-contract.test.mjs`: erneut Exitcode 0, 1 bestandene Assertion, keine Fehler.
> - `node tests/run-single.mjs tests/architecture-evidence.test.mjs`: erneut Exitcode 1 bei 23 Assertions, davon 22 bestanden. Die CLI-Ausgabeprüfung ist in der Sandbox nicht ausführbar. Der separate unveränderte `spawnSync`-Aufruf bestätigt `spawnSync /usr/bin/node EPERM` mit leeren Ausgaben. Der direkte Validatoraufruf mit `--check-date 2028-01-01` liefert den erwarteten Exitcode 1 und beide Fehlercodes `OVERDUE_REVIEW_SCOPE` und `OVERDUE_MODEL_REVIEW`.
> - Gemäß der aktuellen Unterprozessregel in `AGENTS.md` verhindert dieser belegte Sandboxfehler die Übergabe an den Orchestrator nicht. Die Architekturprüfung wird ausdrücklich nicht als vollständig grün behauptet. Die volle Suite einschließlich dieses Tests muss der Orchestrator außerhalb der Sandbox ausführen; Review und Freigabe stehen weiterhin aus.
> - Kein Build und keine volle Suite durch den Implementierer ausgeführt. Generator, Wrapper, Engine-Logik, Konfigurationen und Archive bleiben gegenüber dem Ausgangscommit unverändert; alle Änderungspfade liegen im freigegebenen Umfang.
> - Abschließender direkter Git-Abgleich: `git diff --check` grün, ausschließlich die elf freigegebenen Pfade verändert, keine Differenz in Generator, Wrapper, Laufzeitcode, Tests, Konfigurationen oder Archiven. `AGENTS.md` enthält aktuell 11.413 Zeichen und bleibt unter der 12.000-Zeichen-Grenze. Die automatische Pfadprüfung über einen Node-Unterprozess war ebenfalls durch `spawnSync git EPERM` eingeschränkt; die direkten Git-Aufrufe lieferten den vollständigen Nachweis.

## Abweichungen vom Plan

> Keine.

## Verlauf

<!-- audit:history:begin -->
- Runde 1: Umsetzung · Validierung grün · Prüfurteil freigegeben · 0 neu, 0 geschlossen.
- Runde 1: Halt (instance failure). Grund: role=implementer step=implementer_implementation invocation=[Hash ausgelassen] kind=permission resume=manual resume required auto=false continuations=0 provider=[provider text redacted; sha256=[Hash ausgelassen]; utf8_bytes=80]
- Runde 1: Halt (geänderter Stand bei Wiederaufnahme). Grund: QUOTA-RESUME-DIFF \| repository changed while the role was waiting; expected [Hash ausgelassen], got [Hash ausgelassen]; paths=AGENTS.md, CLAUDE.md, CODEX.md, GEMINI.md, README.md, docs/internal/PROJEKTUEBERSICHT.md, docs/internal/engine-build-doku-implement-review-8362ec28.md, docs/internal/slice-engine-build-doku-arbeitsplan-02-aktive-dokumentation-und-agentenregeln-vereinheitlichen.md, docs/reference/ARCHITEKTUR_UND_FACHKONZEPT.md, docs/reference/TECHNICAL.md, engine/README.md; continue with --resume --approve-gate --gate-rationale '<reviewed reason>' and the unchanged --task-file
- Runde 1: Halt (Stoppanforderung). Grund: Die Dokumentationsumsetzung ist vorhanden und ausschließlich auf freigegebene Pfade beschränkt. Der Wrappertest ist grün (1 Assertion). Die vorgeschriebene Architekturprüfung scheitert nach 22 bestandenen Assertions an der blockierten Unterprozess-Ausgabeerfassung: `spawnSync /usr/bin/node EPERM`. Ein Ersatz ist nicht freigegeben. Der unveränderte Architekturtest muss in einer Umgebung mit funktionierender Ausgabeerfassung ausgeführt werden; anschließend führt der Orchestrator `npm test` aus. Die erneuten Nachweise sind im Slice-Protokoll dokumentiert.
- Runde 1: Halt (geänderter Stand bei Wiederaufnahme). Grund: QUOTA-RESUME-DIFF \| repository changed while the role was waiting; expected [Hash ausgelassen], got [Hash ausgelassen]; paths=AGENTS.md, CLAUDE.md, CODEX.md, GEMINI.md, README.md, docs/internal/PROJEKTUEBERSICHT.md, docs/internal/engine-build-doku-implement-review-8362ec28.md, docs/internal/slice-engine-build-doku-arbeitsplan-02-aktive-dokumentation-und-agentenregeln-vereinheitlichen.md, docs/reference/ARCHITEKTUR_UND_FACHKONZEPT.md, docs/reference/TECHNICAL.md, engine/README.md; continue with --resume --approve-gate --gate-rationale '<reviewed reason>' and the unchanged --task-file
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
> Geprüft wurde der vollständige Diff aus dem Review-Paket für AGENTS.md, CLAUDE.md, CODEX.md, GEMINI.md, README.md, docs/internal/PROJEKTUEBERSICHT.md, docs/reference/ARCHITEKTUR_UND_FACHKONZEPT.md, docs/reference/TECHNICAL.md und engine/README.md. Alle Pfade liegen in der Allowlist von Slice 2. engine.js, build-engine.mjs, Engine-Logik und Konfigurationen sind im Diff nicht enthalten. Die alten Pflichtsätze „danach npm run build:engine“, „Größe kontrollieren“ und „CI/Release soll strict verwenden“ wurden in allen neun Dokumenten ersetzt. Die verbliebenen build:engine-Treffer betreffen Neuerzeugungsanlässe oder sind als historisch gekennzeichnet (PROJEKTUEBERSICHT Punkt 1, engine/README „Historischer Nachweis“). Folgende Aussagen stimmen in den vier Agentendateien überein: Wrapper vs. Bundle, Bundles werden vom Wrappertest abgewiesen, Strict ist optional und scheitert ohne esbuild, ENGINE_BUILD_STRICT/CI mit 1/true, sync-dist ohne Engine-Build. Die Sauberkeitsregeln von sync-dist bleiben unverändert oder werden präzisiert. Die Attestierung weist für diesen Fingerprint npm test mit Exit 0 und PASS aus.

Größtes Restrisiko:
> Das Snapshot enthält nur den Diff, nicht build-engine.mjs, engine.js oder package.json. Deshalb lassen sich mehrere Aussagen nicht gegen den Code prüfen: Strict scheitert vor dem Fallback, die Groß-/Kleinschreibung von 1/true wird ignoriert, andere Buildfehler werden nicht durch den Fallback verdeckt, und esbuild ist keine deklarierte Abhängigkeit. Diese Aussagen stützen sich auf den freigegebenen Plan und den Wrappertest aus Slice 1. Zusätzlich liegt AGENTS.md nach der Erweiterung nahe an der Grenze von 12.000 Zeichen, die im Lauf übertragen wird.

Bruchbedingung:
> Diese Freigabe wäre falsch, wenn build-engine.mjs im Strict-Modus doch einen Fallback schreibt oder ENGINE_BUILD_STRICT/CI anders auswertet als dokumentiert. Sie wäre ebenso falsch, wenn tests/engine-wrapper-contract.test.mjs ein frisches IIFE-Bundle nicht abweist oder AGENTS.md 12.000 Zeichen überschreitet, sodass die Sicherheitsregeln im Lauf abgeschnitten werden.

Vorab-Risikoanalyse:
> Der wahrscheinlichste Fehlschlag: Die Doku beschreibt das Verhalten von build-engine.mjs genauer, als der Code es garantiert, zum Beispiel beim Abbruch vor dem Fallback oder bei der Auswertung der Umgebungsvariablen. Ein späterer Implementierer verlässt sich dann auf eine Strict-Absicherung, die nicht greift. Zweites Risiko: Ein vorhandenes esbuild ersetzt beim normalen Build still den Wrapper. Das ist dokumentiert, und der Wrappertest in npm test fängt es ab, die Vertragsänderung bleibt damit sichtbar.
<!-- audit:approval:end -->

<!-- audit:reference:begin -->
Technischer Bezug: Lauf `watch-20261002-101935.640831Z-41190963141b`, Arbeitseinheit(en) 3; Nachweise in der Recordkette.
<!-- audit:reference:end -->
