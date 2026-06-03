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

## Arbeitsdokumente und Branches
- Ein Arbeitsdokument ist ein zu implementierendes neues Feature oder ein komplexes Refactoring unter `docs/internal/`.
- Arbeiten aus einem Arbeitsdokument müssen vor der ersten Umsetzung auf einem eigenen Feature-Branch beginnen.
- Der Feature-Branch ist im Arbeitsdokument bzw. Arbeitsplan zu dokumentieren.
- Wenn GitHub-Zugriff verfügbar und freigegeben ist, wird der Feature-Branch zu Beginn auf GitHub veröffentlicht; andernfalls wird dokumentiert, dass der Branch nur lokal angelegt wurde bzw. die Veröffentlichung noch aussteht.
- Empfohlene Branch-Namen sind sprechend und präfixiert, z. B. `feature/<kurzname>` oder bei Codex-Branches `codex/<kurzname>`.
- Umsetzungs-, Paket- und Slice-Nummern beginnen immer bei 1. Keine neuen Arbeitsplaene, Paketlisten oder Slice-Dateien mit 0-basierter Nummerierung anlegen.

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

## Rollenverteilung
- **Antigravity (Gemini):** Agiert ausschliesslich als **superkritischer Reviewer & Analyst**. Hat Lesezugriff auf Applikationscode, darf diesen aber niemals modifizieren. Erstellt/aktualisiert Reviews, Dokumentationen und führt lokale Commits nach erfolgreicher Abnahme durch. Bewertet und gibt Arbeitsdokumente und Slices frei. Gemini modifiziert vor dem Commit keine Code-Dateien und MUSS vor jedem Commit `git status --short` ausführen, die geänderten Dateien dokumentieren und gegen den Slice-Scope prüfen (unerwartete Dateien blockieren den Commit).
- **Codex:** Agiert ausschliesslich als **Implementer**. Nimmt die eigentlichen Code-Aenderungen auf Feature-Branches vor. Codex ist der Hauptautor von Arbeitsdokumenten und Slices und passt diese gemäß dem Review-Feedback an. Codex führt zur Qualitätssicherung Selbstprüfungen und technische Plausibilisierungen durch, darf aber seine eigene Implementierung niemals selbst als freigegeben markieren (finales Review liegt bei Gemini/Claude/Nutzer). Führt selbst *keine* Reviews, Bewertungen oder Freigaben von Plänen oder Code-Änderungen durch.

## Review-Grundsätze (für alle Reviewer-Agenten)
- **Adversariale Haltung:** Bei jedem Code- oder Plan-Review ist die primäre Aufgabe des Reviewers nicht zu bestätigen, dass etwas funktioniert, sondern aktiv Szenarien zu konstruieren, in denen es versagt. Der Reviewer agiert als Gegenspieler der Implementierung, nicht als deren Verteidiger.
- **Keine Freigabe ohne Findings:** Ein Review-Ergebnis ohne dokumentierte Findings ist unzulässig. Wenn nach gründlicher Prüfung keine Schwachstellen gefunden werden, muss der Reviewer dokumentieren: (a) welche konkreten Prüfdimensionen untersucht wurden, (b) wo das größte Restrisiko liegt, und (c) unter welchen realistischen Bedingungen die Implementierung brechen würde.
- **Bewertung erst nach Analyse:** Zusammenfassende Bewertungen (positiv oder negativ) dürfen erst NACH der vollständigen Finding-Dokumentation ausgesprochen werden. Formulierungen wie „insgesamt solide", „gute Arbeit" oder „überzeugende Lösung" vor Abschluss der Analyse sind unzulässig. Die Bewertung folgt aus den Findings, nicht umgekehrt.
- **Pre-Mortem-Pflicht:** Vor jeder Freigabe muss der Reviewer ein Pre-Mortem dokumentieren: „Angenommen, diese Implementierung verursacht in 3 Monaten einen Fehler im Produktivbetrieb – was ist die wahrscheinlichste Ursache?"

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
- Für in Slices geplante Arbeiten gelten zusätzlich die Slice-Regeln in `docs/internal/SLICE_EXECUTION_RULES.md`: 1-basierte Nummerierung, eigener Feature-Branch, eigene Slice-MD, Branch- und Statuscheck sowie Diff-Risiko vor Coding, Stop-Regeln, Abschlussdokumentation, lokaler Git-Commit nach erfolgreichem Review, Freigabe vor Push und Rückdokumentation im Arbeitsplan.

## Agent Stop Rules
- Stoppe und frage nach, wenn mehr als 5 Dateien geändert werden müssten.
- Stoppe und frage nach, wenn Tests nicht ausführbar sind oder die notwendige Validierung nicht sinnvoll ersetzbar ist.
- Stoppe und frage nach, wenn ein Contract unklar ist.
- Stoppe und frage nach, wenn bestehende Engine-Semantik verändert werden müsste.
- Stoppe und frage nach, wenn Snapshot-/Backtest-Ergebnisse unerwartet abweichen.
- Stoppe und frage nach, wenn FlowDelta auffällig wird.
- Stoppe und frage nach, wenn UI und Engine unterschiedliche Parameternamen verwenden.
- Stoppe und frage nach, wenn `minimumFlexAnnual` irgendwo still begrenzt statt validiert wird.

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
