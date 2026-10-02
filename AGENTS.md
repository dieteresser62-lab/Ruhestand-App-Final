## Zweck
- Projektweite Arbeitsregeln für Agenten in diesem Repository.
- Beschreibt den tatsächlichen Stand der Ruhestands-App als lokale Browser-/Tauri-Anwendung und die beiden Betriebsarten, in denen an ihr gearbeitet wird.
- Ist die gemeinsame Referenz für Rollen, Stoppgründe, Ausführung, Validierung, Sicherheitsgrenzen und Doku-Sync.
- Projekt- und architekturspezifische Details müssen mit `README.md` und den Referenzdokumenten konsistent bleiben.

## Projektstand
- Die Suite hat mehrere Einstiegspunkte: `Balance.html`, `Simulator.html`, `index.html`, `depot-tranchen-manager.html` und `Handbuch.html`.
- Die fachliche Logik liegt in nativen ES-Modulen unter `app/`, `engine/`, `workers/` und `types/`.
- Desktop-Paketierung läuft über Tauri in `src-tauri/`. `npm run build:desktop` baut `dist/` mit `scripts/sync-dist.mjs` und danach die EXE.
- Die Browser-Variante startet mit `npm run serve` bzw. `start_suite.cmd` (`scripts/serve.mjs`).
- Generierte Artefakte sind insbesondere `engine.js` und `dist/`; diese sind nicht der primäre Bearbeitungsort. Die Desktop-EXE wird lokal gebaut und gehört nicht ins Repository.

## Source of Truth
- Laufzeit- und Build-Kommandos: `package.json`
- Produkt- und Funktionsüberblick: `README.md`
- Technische Architektur: `docs/reference/TECHNICAL.md`
- Modulzuschnitte:
  - `docs/reference/BALANCE_MODULES_README.md`
  - `docs/reference/SIMULATOR_MODULES_README.md`
  - `engine/README.md`
- Test-Infrastruktur: `tests/README.md`
- Desktop-Konfiguration: `src-tauri/tauri.conf.json`
- Konfiguration orchestrierter Läufe (Pfadklassen, Testbefehl, Ablaufschalter, bei Bedarf Rollenbelegung): `orchestrator.toml`
- Keep instruction files synchronized and non-contradictory:
  - `AGENTS.md`
  - `CLAUDE.md`
  - `CODEX.md`
  - `GEMINI.md`

## Rollen
- Es gibt drei Rollen: **Implementierer** (plant und setzt um), **Prüfer** (prüft Plan und jedes Arbeitspaket gegenläufig) und **Finalprüfer** (prüft den fertigen Zweig als Ganzes). Welcher Agent welche Rolle übernimmt, legt im orchestrierten Lauf die Belegung fest, im Handbetrieb die Anweisung des Nutzers (siehe Betriebsarten). Ein Agent bekommt seine Rolle immer zugewiesen und leitet sie nie aus seinem Namen ab.
- Prüfer und Finalprüfer arbeiten nur lesend. Niemand gibt eigene Arbeit frei.
- Agenten pushen und mergen nie, schreiben keine Historie um und löschen nichts destruktiv ohne ausdrückliche Freigabe des Nutzers. Den lokalen Abschlussmerge im orchestrierten Lauf führt allein der Orchestrator aus (siehe unten).

## Betriebsarten

### Orchestrierter Lauf (Dual-Agent-Orchestrator)
- Der Nutzer legt eine Idee in `inbox/`. Der Orchestrator plant, schneidet Arbeitspakete, legt Zielbranch, Arbeitsplan und Prüfberichte unter `docs/internal/` an, führt nach jedem Arbeitspaket `npm test` aus und committet.
- **Belegung:** Standard ist Codex als Implementierer, Claude als Prüfer und Finalprüfer; diese Plätze sind zertifiziert. Andere Belegungen werden in `orchestrator.toml` unter `[roles]` und `[agent_profiles.*]` gewählt; der Hersteller des Implementierers muss sich von beiden Prüfplätzen unterscheiden. Claude als Implementierer, Codex als Prüfer oder Finalprüfer und Antigravity (Gemini) als Prüfer oder Finalprüfer sind `experimental`; Antigravity sendet den vollständigen Repository-Stand an Google.
- **Abschluss:** Nach einem Finalreview ohne Befunde archiviert der Orchestrator die Laufdokumente unter `docs/internal/archive/` und führt den Zielbranch standardmäßig lokal in `main` zusammen; danach startet er einen vorhandenen lokalen `post-merge`-Hook (Grenze 600 Sekunden). Gepusht wird nie. Mit `merge_completed_branch = false` unter `[workflow]` bleibt der Zielbranch ungemergt ausgecheckt.
- Der Implementierer bearbeitet nur den zugewiesenen Auftrag innerhalb seines Umfangs. Keine Branches anlegen oder wechseln, nicht stagen, nicht committen, nicht pushen oder mergen, keine eigenen Slice-Dokumente neben dem Arbeitsplan des Orchestrators.
- **Sandbox des Codex-Implementierers:** kein Netz; beschreibbar sind nur das Repository und ein privater Scratch-Ordner (`TMPDIR`); `.git/`, `.orchestrator/`, `inbox/`, `outbox/` und Agentenverzeichnisse wie `.codex/` oder `.claude/` sind schreibgeschützt; vom Home-Verzeichnis ist nur das Codex-Programmpaket sichtbar. `node` und `npm` kommen deshalb aus dem System, Abhängigkeiten aus `node_modules/` im Repository. `npm install` und andere Netzzugriffe scheitern dort; fehlt eine Abhängigkeit, gilt `OPERATOR-PREREQUISITE-MISSING`.
- **Hängererkennung:** Gibt der Implementierer 15 Minuten lang nichts aus (laufende Befehle zählen nicht mit) oder läuft ein einzelner Befehl länger als 60 Minuten, bricht der Orchestrator den Aufruf ab und wiederholt ihn. Lange Rechenläufe wie große Monte-Carlo- oder Sweep-Läufe gehören deshalb nicht in die gezielten Testläufe des Agenten.
- Die volle Suite führt nur der Orchestrator aus; gezielte Läufe mit `node tests/run-single.mjs <datei>` sind erlaubt. Ein in der Agenten-Sandbox gescheiterter Port-, Browser- oder Unterprozessstart (etwa `spawnSync … EPERM` in Tests, die `node` als Kindprozess starten) ist kein Grund zum Anhalten: Solche Prüfungen im Bericht als in der Sandbox nicht ausführbar nennen; der Orchestrator führt `npm test` außerhalb der Sandbox aus.
- Antwortformat und Ablauf gibt die Anfrage des Orchestrators vor. Diese Datei erreicht im Lauf alle drei Rollen (die ersten 12.000 Zeichen). `CLAUDE.md`, `CODEX.md` und `GEMINI.md` werden dort nicht gelesen; sie gelten für den Handbetrieb und die direkte Nutzung der CLIs.

### Handbetrieb (Claude an der Front)
- Claude arbeitet als vom Nutzer gesteuerte Sitzung: legt vor der Umsetzung einen Feature-Branch an, schreibt eine Implementierungsanweisung und startet Codex direkt.
- Anweisungen und Reviews liegen unversioniert in `inbox/backlog/`; die Wache des Orchestrators liest nur `inbox/*.md`.
- Codex setzt die Anweisung um, erfüllt ihre Meldepflichten vor dem Bauen, fährt gezielte Tests und berichtet. Keine Branchwechsel, keine Commits, kein Push.
- Claude prüft das Ergebnis mit eigenen Messungen (eigene Mutationen, volle Suite auf genau dem Stand, der committet wird), gibt Befunde an Codex zurück und committet erst nach grüner Prüfung lokal, auf ausdrückliche Anweisung des Nutzers. Push und Merge nur auf ausdrückliche Anweisung.
- Commit-Nachrichten: eine Zeile im Conventional-Commit-Stil (`<typ>: <imperativ>`), englisch, ohne Trailer.
- Empfohlene Branch-Namen sind sprechend und präfixiert, z. B. `feature/<kurzname>`.
- Umsetzungs-, Paket- und Slice-Nummern beginnen immer bei 1. Keine neuen Arbeitspläne, Paketlisten oder Slice-Dateien mit 0-basierter Nummerierung anlegen.

## Stoppgründe
Es gelten dieselben Stoppgründe wie im Orchestrator. Der Implementierer hält an und meldet, statt zu raten:
- `CONTRACT-UNCLEAR` – ein Vertrag ist unklar, oder die Umsetzung würde einen bestehenden Vertrag still ändern. Dazu gehören, sofern der Auftrag es nicht ausdrücklich verlangt: geänderte Engine-Semantik, unerwartet abweichende Snapshot- oder Backtest-Ergebnisse, ein auffälliges FlowDelta, unterschiedliche Parameternamen in UI und Engine sowie ein `minimumFlexAnnual`, das still begrenzt statt validiert wird.
- `OPERATOR-PREREQUISITE-MISSING` – eine Voraussetzung fehlt, die nur der Nutzer schaffen kann, etwa ein Werkzeug, ein Zugang oder eine Datei.
- `SCOPE-EXTENSION-REQUESTED` – die Umsetzung braucht Dateien außerhalb des zugewiesenen Umfangs.

Im Handbetrieb gelten zusätzlich die Stoppbedingungen der jeweiligen Anweisung.

## Ausführung
- Start implementation/review immediately for actionable tasks.
- Rückfragen nur bei wesentlicher Mehrdeutigkeit, fehlender Berechtigung, Secrets oder destruktiven Aktionen; im Lauf über die Stoppgründe oben.
- Fremde, nicht zum Auftrag gehörende Änderungen im Arbeitsbaum gelten als vorhanden und werden nie überschrieben.
- Arbeite in den Quellmodulen, nicht in generierten Artefakten.
- Teile Logik so auf, wie das Repo bereits strukturiert ist:
  - `app/balance/` und `app/simulator/` für UI-nahe Feature-Logik,
  - `app/profile/` und `app/tranches/` für Profilverbund und Tranchen,
  - `app/shared/` für gemeinsam genutzte Formatter, Flags und Hilfen,
  - `engine/` für deterministische Kernlogik,
  - `workers/` und DOM-freie Runner für parallele Rechenpfade.
- `engine.js` nie manuell editieren. Aktuell ist es ein reiner generierter Modul-Wrapper für `engine/index.mjs`; Fachtests und Worker importieren die Engine-Module direkt. Änderungen an Fachlogik, Versionswerten oder API-Methoden hinter demselben Import erfordern keinen Neuaufbau.
- Neuerzeugung über `build-engine.mjs` nur bei fehlendem Artefakt oder Änderungen am Generator, Import-Einstieg oder Wrapper-/Global-/Exportvertrag; Generator, Artefakt und Wrappertest gemeinsam prüfen.
- `npm run build:engine` schreibt ohne `esbuild` im nicht strikten Modus den konstanten Wrapper, mit `esbuild` ein echtes IIFE-Bundle. Bundles übernehmen Quelländerungen nicht automatisch und werden von `tests/engine-wrapper-contract.test.mjs` auch frisch gebaut abgewiesen; ein Bundlewechsel braucht eine eigene geprüfte Vertragsänderung.
- `npm run build:engine:strict` ist optional für einen bewusst gewählten Bundle-Auslieferungsvertrag, keine Voraussetzung für den bestehenden Browser-/Tauri-Wrapperpfad. Ohne `esbuild` scheitert Strict vor dem Fallback. Auch `ENGINE_BUILD_STRICT` oder `CI` mit `1` oder `true` (ohne Beachtung der Groß-/Kleinschreibung) machen den normalen Build strikt.
- `scripts/sync-dist.mjs` übernimmt `engine/` und `engine.js` aus demselben gewählten Commit und führt keinen Engine-Build aus. Bestehende Sauberkeits-/Versionierungsanforderungen bleiben erhalten.
- `dist/` nur anfassen, wenn der Auftrag explizit Build-, Sync- oder Release-Artefakte umfasst; keine EXE oder andere Build-Binaries committen.

## Validierung
- Default: `npm test`. Der Browser-Smoke (`npm run test:browser`) läuft im orchestrierten Lauf als zusätzliche Prüfregel außerhalb der Sandbox mit, sobald ein Arbeitspaket Oberfläche, Logik oder den Smoke selbst ändert (`orchestrator.toml`). In der Agenten-Sandbox scheitert er am Serverstart; gezielte Browserläufe dort sind kein Grund zum Anhalten.
- Mandatory after changes to:
  - `engine/`,
  - `workers/`,
  - DOM-freie Runner wie Monte Carlo, Sweep oder Auto-Optimize,
  - Persistenz- oder Datenverträge in Profil-/Tranchen-Modulen,
  - gemeinsam genutzte Formatter, Feature-Flags oder Engine-Contracts.
- Nach Änderungen an `engine/` oder an der öffentlichen `EngineAPI` bleiben Fachtests und Vertragsprüfungen verpflichtend; ein unveränderter Wrapper ist erwartbar. Der Wrappervertrag wird durch `tests/engine-wrapper-contract.test.mjs` in `npm test` geprüft; im orchestrierten Lauf fährt die volle Suite allein der Orchestrator.
- Für fokussierte Fehlersuche sind gezielte Läufe via `node tests/run-single.mjs <datei>` zulässig; wenn nicht die ganze Suite lief, muss das berichtet werden.

## Dokumentations-Sync
- Wenn Architektur, Modulzuschnitt, Build-/Startpfade oder Nutzer-Workflows geändert werden, mindestens die betroffenen Referenzen aktualisieren:
  - `README.md`
  - `docs/reference/TECHNICAL.md`
  - relevante Modul-READMEs
- Änderungen an Projektregeln müssen in `AGENTS.md`, `CODEX.md`, `CLAUDE.md` und `GEMINI.md` widerspruchsfrei bleiben.

## Sicherheit
- No destructive commands (for example `rm -rf`, hard reset, history rewrite, force push) without explicit approval.
- Never commit secrets, tokens, credentials, or sensitive local paths.
- Keine Snapshots, Logs, lokale Exporte oder personenbezogene Finanzdaten unbedacht in Doku oder Tests übernehmen.
- Keep scope limited to the assigned task.
