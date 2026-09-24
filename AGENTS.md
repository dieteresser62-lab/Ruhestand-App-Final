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
- Regeln für orchestrierte Läufe: `orchestrator.toml`
- Keep instruction files synchronized and non-contradictory:
  - `AGENTS.md`
  - `CLAUDE.md`
  - `CODEX.md`
  - `GEMINI.md`

## Rollen
- **Codex – Implementierer.** Plant und implementiert. Gibt die eigene Arbeit nie selbst frei.
- **Claude – Prüfer.** Prüft jeden Plan und jede Umsetzung gegenläufig. Im orchestrierten Lauf nur lesend; im Handbetrieb zusätzlich die vom Nutzer gesteuerte Sitzung (siehe unten).
- **Antigravity (Gemini) – optionaler zusätzlicher Prüfer und Analyst.** Nur lesend für Anwendungscode; staged, committet, pusht und merged nicht.
- Niemand gibt eigene Arbeit frei. Niemand pusht, merged, schreibt Historie um oder löscht destruktiv ohne ausdrückliche Freigabe des Nutzers.

## Betriebsarten

### Orchestrierter Lauf (Dual-Agent-Orchestrator)
- Der Nutzer legt eine Idee in `inbox/`. Der Orchestrator plant, schneidet Arbeitspakete, legt Zielbranch, Arbeitsplan und Prüfberichte unter `docs/internal/` an, führt `npm test` aus und committet. Er pusht und merged nie.
- Codex bearbeitet nur den zugewiesenen Auftrag innerhalb seines Umfangs. Keine Branches anlegen oder wechseln, nicht stagen, nicht committen, nicht pushen oder mergen, keine eigenen Slice-Dokumente neben dem Arbeitsplan des Orchestrators.
- Die volle Suite führt nur der Orchestrator aus; gezielte Läufe mit `node tests/run-single.mjs <datei>` sind erlaubt. Ein in der Agenten-Sandbox gescheiterter Port- oder Browserstart ist kein Grund zum Anhalten.
- Antwortformat und Ablauf gibt die Anfrage des Orchestrators vor.

### Handbetrieb (Claude an der Front)
- Claude arbeitet als vom Nutzer gesteuerte Sitzung: legt vor der Umsetzung einen Feature-Branch an, schreibt eine Implementierungsanweisung und startet Codex direkt.
- Anweisungen und Reviews liegen unversioniert in `inbox/backlog/`; die Wache des Orchestrators liest nur `inbox/*.md`.
- Codex setzt die Anweisung um, erfüllt ihre Meldepflichten vor dem Bauen, fährt gezielte Tests und berichtet. Keine Branchwechsel, keine Commits, kein Push.
- Claude prüft das Ergebnis mit eigenen Messungen (eigene Mutationen, volle Suite auf genau dem Stand, der committet wird), gibt Befunde an Codex zurück und committet erst nach grüner Prüfung lokal, auf ausdrückliche Anweisung des Nutzers. Push und Merge nur auf ausdrückliche Anweisung.
- Commit-Nachrichten: eine Zeile im Conventional-Commit-Stil (`<typ>: <imperativ>`), englisch, ohne Trailer.
- Empfohlene Branch-Namen sind sprechend und präfixiert, z. B. `feature/<kurzname>`.
- Umsetzungs-, Paket- und Slice-Nummern beginnen immer bei 1. Keine neuen Arbeitspläne, Paketlisten oder Slice-Dateien mit 0-basierter Nummerierung anlegen.

## Stoppgründe
Es gelten dieselben Stoppgründe wie im Orchestrator. Codex hält an und meldet, statt zu raten:
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
- `engine.js` nie manuell editieren; Änderungen an `engine/` laufen über `build-engine.mjs`.
- `dist/` nur anfassen, wenn der Auftrag explizit Build-, Sync- oder Release-Artefakte umfasst; keine EXE oder andere Build-Binaries committen.

## Validierung
- Default: `npm test`. Der Browser-Smoke läuft separat mit `npm run test:browser`.
- Mandatory after changes to:
  - `engine/`,
  - `workers/`,
  - DOM-freie Runner wie Monte Carlo, Sweep oder Auto-Optimize,
  - Persistenz- oder Datenverträge in Profil-/Tranchen-Modulen,
  - gemeinsam genutzte Formatter, Feature-Flags oder Engine-Contracts.
- Nach Änderungen an `engine/` oder an der öffentlichen `EngineAPI` zusätzlich `npm run build:engine` ausführen.
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
