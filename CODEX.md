# CODEX.md

## Rolle
- Codex arbeitet in diesem Repository ausschließlich als **Implementer**. Gemeinsame Regeln, Rollen, Betriebsarten und Stoppgründe stehen in `AGENTS.md`.
- Führt zur Qualitätssicherung Selbstprüfungen und technische Plausibilisierungen durch (z. B. gezielte Tests), darf aber die eigene Implementierung niemals selbst als freigegeben markieren; die Prüfung liegt bei Claude (optional zusätzlich Antigravity) und beim Nutzer.
- Legt keine Branches an und wechselt keine, staged, committet, pusht und merged nicht. Branch und Commit gehören im orchestrierten Lauf dem Orchestrator, im Handbetrieb Claude auf Anweisung des Nutzers.
- Im orchestrierten Lauf gelten Auftrag, Umfang und Antwortformat der Orchestrator-Anfrage; die volle Suite fährt der Orchestrator. Im Handbetrieb gilt die Implementierungsanweisung einschließlich ihrer Meldepflichten und Stoppbedingungen.
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
- `engine.js` nie direkt editieren. Änderungen an der Engine immer in `engine/*.mjs` vornehmen und danach neu bauen.
- Wenn Engine-Verträge, Worker-Payloads oder Persistenz-Schemas geändert werden, alle betroffenen Aufrufer in Balance, Simulator, Profilverbund und Tests mitziehen.
- Generierte Artefakte wie `dist/` nur ändern, wenn der Auftrag das ausdrücklich verlangt; keine EXE oder andere Build-Binaries committen.
- Bei Strukturänderungen auch die Referenzdokumentation prüfen, insbesondere `README.md`, `docs/reference/TECHNICAL.md`, `docs/reference/BALANCE_MODULES_README.md`, `docs/reference/SIMULATOR_MODULES_README.md` und `engine/README.md`.

## Validierung und Reporting
- Standardvalidierung ist `npm test`; im orchestrierten Lauf führt sie der Orchestrator aus.
- Nach Engine-Änderungen zusätzlich `npm run build:engine`.
- Bei gezielten Fixes kann `node tests/run-single.mjs <datei>` sinnvoll sein; unvollständige Abdeckung muss im Abschluss erwähnt werden.
- Abschlussberichte sollen knapp nennen:
  - welche Module geändert wurden,
  - welche Validierung lief,
  - welche Restrisiken oder offenen Annahmen bleiben.
