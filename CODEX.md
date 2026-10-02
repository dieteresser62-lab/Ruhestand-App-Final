# CODEX.md

## Rolle
- Codex übernimmt die zugewiesene Rolle. Gemeinsame Regeln, Rollen, Betriebsarten und Stoppgründe stehen in `AGENTS.md`.
- **Im orchestrierten Lauf** bestimmt die Belegung die Rolle: standardmäßig **Implementierer** (zertifiziert), auf ausdrückliche Wahl in `orchestrator.toml` auch Prüfer oder Finalprüfer (`experimental`, dann nur lesend). Der Orchestrator startet Codex dort ohne diese Datei; maßgeblich sind `AGENTS.md` und seine Anfrage mit Auftrag, Umfang und Antwortformat. Die volle Suite fährt der Orchestrator.
- **Im Handbetrieb** ist Codex der Implementierer und setzt Claudes Implementierungsanweisung einschließlich ihrer Meldepflichten und Stoppbedingungen um.
- Führt als Implementierer zur Qualitätssicherung Selbstprüfungen und technische Plausibilisierungen durch (z. B. gezielte Tests), darf aber die eigene Implementierung niemals selbst als freigegeben markieren; die Prüfung liegt bei den Prüfrollen und beim Nutzer.
- Legt keine Branches an und wechselt keine, staged, committet, pusht und merged nicht. Branch, Commit und lokaler Abschlussmerge gehören im orchestrierten Lauf dem Orchestrator, im Handbetrieb Claude auf Anweisung des Nutzers.
- Diese Datei muss konsistent mit `AGENTS.md`, `CLAUDE.md` und `GEMINI.md` bleiben.

## Repo-spezifische Arbeitsweise
- Vor Änderungen zuerst den betroffenen Quellpfad lesen und die bestehende Modulgrenze respektieren.
- Umsetzungs-, Paket- und Slice-Nummern in neuen Arbeitsplaenen beginnen immer bei 1; keine 0-basierte Nummerierung anlegen.
- UI-nahe Änderungen gehören in die vorhandenen Feature-Bereiche:
  - `app/balance/` für Balance-App,
  - `app/simulator/` für Simulator,
  - `app/profile/` und `app/tranches/` für Profilverbund und Tranchen,
  - `app/shared/` für gemeinsam genutzte Hilfen.
- Deterministische Fachlogik gehört bevorzugt nach `engine/`.
- Rechenintensive, DOM-freie Abläufe gehören nach `workers/`, `monte-carlo-runner.js`, `sweep-runner.js` oder angrenzende Runner-Module statt in UI-Dateien.
- Native ES-Module und Browser-/Tauri-Kompatibilität erhalten; keine unnötigen Framework- oder Build-Step-Abhängigkeiten einführen.
- Vorhandene Spezialisierung beibehalten: lieber bestehendes Fachmodul erweitern als neue Sammeldateien oder Monolithen aufbauen.

## Implementierungsregeln
- `engine.js` nie direkt editieren. Die Engine-Quellen liegen unter `engine/`; der aktuelle reine Modul-Wrapper importiert `engine/index.mjs`, Fachtests und Worker nutzen die Module direkt. Fach-, Versions- oder API-Methodenänderungen hinter demselben Import benötigen keinen Neuaufbau.
- Neuerzeugung nur bei fehlendem Artefakt oder geändertem Generator, Import-Einstieg oder Wrapper-/Global-/Exportvertrag gemäß `AGENTS.md`; Generator, Artefakt und Test gemeinsam prüfen. `build:engine` erzeugt ohne `esbuild` nicht strikt den konstanten Wrapper, mit `esbuild` ein IIFE-Bundle. Ein Bundle übernimmt Quelländerungen nicht automatisch und wird vom Wrappertest auch frisch gebaut abgewiesen; der Wechsel benötigt einen eigenen Vertragsreview.
- `build:engine:strict` ist optional bei bewusst verlangter Bundle-Auslieferung und scheitert ohne `esbuild`; auch `ENGINE_BUILD_STRICT` oder `CI` mit `1`/`true` (Groß-/Kleinschreibung beliebig) machen den normalen Build strikt. Der Browser-/Tauri-Wrapperpfad braucht keinen Strict-Build. `sync-dist` übernimmt Module und Wrapper aus demselben Commit ohne Engine-Build; seine Sauberkeits-/Versionierungsanforderungen gelten weiter.
- Wenn Engine-Verträge, Worker-Payloads oder Persistenz-Schemas geändert werden, alle betroffenen Aufrufer in Balance, Simulator, Profilverbund und Tests mitziehen.
- Generierte Artefakte wie `dist/` nur ändern, wenn der Auftrag das ausdrücklich verlangt; keine EXE oder andere Build-Binaries committen.
- Bei Strukturänderungen auch die Referenzdokumentation prüfen, insbesondere `README.md`, `docs/reference/TECHNICAL.md`, `docs/reference/BALANCE_MODULES_README.md`, `docs/reference/SIMULATOR_MODULES_README.md` und `engine/README.md`.

## Validierung und Reporting
- Standardvalidierung ist `npm test`; im orchestrierten Lauf führt sie der Orchestrator aus.
- Nach Engine- oder öffentlichen API-Änderungen sind Fachtests und Vertragsprüfungen verpflichtend; ein unverändertes `engine.js` ist im Wrapperbetrieb erwartbar. `tests/engine-wrapper-contract.test.mjs` schützt den reinen Wrapper in der Standardsuite.
- Bei gezielten Fixes kann `node tests/run-single.mjs <datei>` sinnvoll sein; unvollständige Abdeckung muss im Abschluss erwähnt werden.
- Abschlussberichte sollen knapp nennen:
  - welche Module geändert wurden,
  - welche Validierung lief,
  - welche Restrisiken oder offenen Annahmen bleiben.
