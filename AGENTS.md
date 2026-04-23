## Zweck
- Projektweite Arbeitsregeln für Agenten in diesem Repository.
- Beschreibt den tatsächlichen Stand der Ruhestands-App als lokale Browser-/Tauri-Anwendung.
- Ist die gemeinsame Referenz für Ausführung, Validierung, Sicherheitsgrenzen und Doku-Sync.
- Projekt- und architekturspezifische Details müssen mit `README.md` und den Referenzdokumenten konsistent bleiben.

## Projektstand
- Die Suite hat mehrere Einstiegspunkte: `Balance.html`, `Simulator.html`, `index.html`, `depot-tranchen-manager.html` und `Handbuch.html`.
- Die fachliche Logik liegt in nativen ES-Modulen unter `app/`, `engine/`, `workers/` und `types/`.
- Desktop-Paketierung läuft über Tauri in `src-tauri/`.
- Generierte Artefakte sind insbesondere `engine.js`, `dist/` und `RuheStandSuite.exe`; diese sind nicht der primäre Bearbeitungsort.

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
- Keep instruction files synchronized and non-contradictory:
  - `AGENTS.md`
  - `CLAUDE.md`
  - `CODEX.md`
  - `GEMINI.md`

## Ausführung
- Start implementation/review immediately for actionable tasks.
- Ask clarifying questions only when:
  - Anforderungen technisch mehrdeutig sind,
  - mehrere Richtungen mit klar unterschiedlichen Trade-offs offenstehen,
  - Berechtigungen, Secrets oder externe Freigaben fehlen,
  - eine destruktive Aktion im Raum steht.
- Arbeite in den Quellmodulen, nicht in generierten Artefakten.
- Teile Logik so auf, wie das Repo bereits strukturiert ist:
  - `app/balance/` und `app/simulator/` für UI-nahe Feature-Logik,
  - `app/profile/` und `app/tranches/` für Profilverbund und Tranchen,
  - `app/shared/` für gemeinsam genutzte Formatter, Flags und Hilfen,
  - `engine/` für deterministische Kernlogik,
  - `workers/` und DOM-freie Runner für parallele Rechenpfade.
- `engine.js` nie manuell editieren; Änderungen an `engine/` laufen über `build-engine.mjs`.
- `dist/` und `RuheStandSuite.exe` nur anfassen, wenn der Auftrag explizit Build-, Sync- oder Release-Artefakte umfasst.

## Validierung
- Default: `npm test`
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
