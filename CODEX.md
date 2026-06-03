# CODEX.md

## Rolle
- Codex arbeitet in diesem Repository ausschließlich als **Implementer**.
- Führt die eigentlichen Code-Aenderungen auf Feature-Branches durch. Führt selbst *keine* Reviews von Plänen, Dokumenten oder Code durch und erstellt keine Git-Commits.
- Gemeinsame Ausführungs-, Validierungs- und Sicherheitsregeln kommen aus `AGENTS.md`.
- Diese Datei muss konsistent mit `CLAUDE.md` und `GEMINI.md` bleiben.

## Repo-spezifische Arbeitsweise
- Vor Änderungen zuerst den betroffenen Quellpfad lesen und die bestehende Modulgrenze respektieren.
- Bei Arbeitsdokumenten für neue Features oder komplexe Refactorings vor der ersten Umsetzung auf einen eigenen Feature-Branch wechseln bzw. ihn anlegen und den Branch im Arbeitsplan dokumentieren. Veröffentlichung nach GitHub erfolgt nur mit verfügbarer/freigegebener Berechtigung.
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
- Generierte oder ausgelieferte Artefakte wie `dist/` und `RuheStandSuite.exe` nur ändern, wenn der Auftrag das ausdrücklich verlangt.
- Bei Strukturänderungen auch die Referenzdokumentation prüfen, insbesondere `README.md`, `docs/reference/TECHNICAL.md`, `docs/reference/BALANCE_MODULES_README.md`, `docs/reference/SIMULATOR_MODULES_README.md` und `engine/README.md`.

## Validierung und Reporting
- Standardvalidierung ist `npm test`.
- Nach Engine-Änderungen zusätzlich `npm run build:engine`.
- Bei gezielten Fixes kann `node tests/run-single.mjs <datei>` sinnvoll sein; unvollständige Abdeckung muss im Abschluss erwähnt werden.
- Abschlussberichte sollen knapp nennen:
  - welche Module geändert wurden,
  - welche Validierung lief,
  - welche Restrisiken oder offenen Annahmen bleiben.
