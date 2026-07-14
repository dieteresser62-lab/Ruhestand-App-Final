# Slice Tranchenmanagement 09: E2E, Migration und Dokumentations-Sync

**Feature-Branch:** `codex/tranchenmanagement-hardening`
**GitHub-Status:** lokal; Veröffentlichung ausstehend
**Status:** geplant – Planreview ausstehend
**Abhängigkeiten:** Slices 01 bis 08 abgeschlossen und freigegeben
**GAPs:** TM-17, TM-21, TM-22 sowie Abschlussgates aller P0/P1-GAPs

## Ziel

Die Slice-Ergebnisse werden über echte Browser- und Migrationspfade als Gesamtsystem abgesichert. Anschließend werden Architektur-, Modul-, Nutzer- und Testdokumentation auf den implementierten Vertrag synchronisiert und sensible Beispielbestände aus versionierter Dokumentation entfernt.

## Verbindlicher Entscheidungsstand und technische Reviewpunkte

- O-01 bis O-10 sind durch den Nutzer entschieden und in Hauptplan/GAP-Analyse dokumentiert.
- Technischer Reviewpunkt: tatsächliche Migration für jeden unterstützten Altzustand aus Slice 02/03.
- Technischer Reviewpunkt: Ob Handbuchscreenshots benötigt werden; sie dürfen keine realen oder privaten Bestandswerte enthalten.

## Akzeptanzkriterien

- Ein Browser-E2E deckt mindestens ab: Profilwahl, Manager öffnen, gültige Tranche anlegen, editieren, validierten Kurs-/Wertpfad, Reload, anderes Profil, Löschen/Reset, unveränderten Realbestand nach reiner Empfehlung/Simulation sowie genau einmal angewandten bestätigten Reconcile gemäß O-09.
- Ein Tastatur-/Mobile-E2E prüft Dialogfokus, Escape/Fokusrückgabe, zugängliche Namen und 390-Pixel-Overflow.
- Browser-E2E verwendet temporäre Testprofile und räumt ausschließlich selbst erzeugte Testdaten auf.
- Migrationsfälle umfassen gültige Altbestände, widersprüchliche Kategorie/Typ-Daten, fehlende optionale Felder, Duplikat-IDs, leere Overrides und korruptes Rohpayload.
- Migration ist deterministisch, idempotent und raw-preserving bei nicht automatisch behebbaren Daten; keine stille Löschung oder Wertänderung.
- Page-/E2E-Tests enthalten nachweislich Assertions und laufen im normalen Gate; ein reiner Modulimport gilt nicht als Testabdeckung.
- Coverage-Inventar meldet die zentralen Tranchenmodule und kann keinen 0-%-Pagepfad als vollständig getestet darstellen.
- `npm test`, `npm run test:browser` und alle durch frühere Slices ausgelösten Pflichtgates sind grün.
- Eine neue `docs/reference/TRANCHEN_MODULES_README.md` beschreibt Ownership, Datenvertrag, Persistenz-, Quote-, Balance-, Simulator- und Reconcile-Grenzen.
- `README.md`, technische Referenzen, Modul-READMEs, Handbuch und Workflowtexte widersprechen dem implementierten Contract nicht.
- Die alte Mehrtranchen-Anleitung enthält keine privaten Portfolio-, Personen- oder konkreten Realbestandsdaten und beschreibt keine entfernten LocalStorage-/Teilimport-Controls.
- Doku-Links sind gültig; Arbeitsplan und alle neun Slices enthalten tatsächliche Ergebnisse, Testläufe, Abweichungen, Restrisiken und Freigabestatus.

## Scope

- Browser-E2E und Migrations-/Persistenzregressionen.
- Coverage-Gate für zentrale Tranchenpfade.
- Neue Tranchen-Modulreferenz.
- Synchronisation aller nachweislich betroffenen Produkt-, Architektur-, Workflow-, Nutzer- und Testdokumente.
- Sanitizing veralteter/sensibler Beispiele.

## Nicht-Scope

- Keine neue Fachfunktion.
- Kein Release-EXE-Build, sofern nicht separat ausdrücklich beauftragt.
- Keine realen Portfolioexporte als Fixture.
- Keine Dokuänderung ohne Bezug zum Tranchenvertrag.

## Geplante Programmdateien

Maximal sechs:

- `tests/browser-smoke.test.mjs`
- `tests/persistence.test.mjs`
- `tests/profile-storage.test.mjs`
- `tests/coverage-inventory.test.mjs`
- `tests/tauri-csp.test.mjs`
- `Handbuch.html`

Geplante reine Markdown-Dateien, nicht auf die Programmdatei-Stopregel angerechnet, aber vor Coding im tatsächlichen Diff-Risiko-Block zu bestätigen:

- `docs/reference/TRANCHEN_MODULES_README.md` (neu)
- `README.md`
- `docs/reference/TECHNICAL.md`
- `docs/reference/ARCHITEKTUR_UND_FACHKONZEPT.md`
- `docs/reference/WORKFLOW_PSEUDOCODE.md`
- `docs/reference/ENGINE_DECISION_LOGIC.md`
- `docs/reference/DATA_SOURCES.md`
- `docs/reference/PROFILVERBUND_FEATURES.md`
- `docs/reference/BALANCE_MODULES_README.md`
- `docs/reference/SIMULATOR_MODULES_README.md`
- `docs/guides/MULTI-TRANCHEN-ANLEITUNG.md`
- `docs/README.md`
- `docs/internal/README.md`
- `docs/internal/PROJEKTUEBERSICHT.md`
- `tests/README.md`
- `engine/README.md`, nur falls sich ein öffentlicher Engine-Vertrag tatsächlich geändert hat.

## Git- und Diff-Risiko vor Coding

```text
git branch --show-current: AUSSTEHEND
git status --short: AUSSTEHEND
```

Geplante Dateien:

- höchstens die fünf Testdateien, `Handbuch.html` und die nach tatsächlicher Betroffenheit bestätigten reinen Markdown-Dateien oben.

Voraussichtliche Änderungstiefe:

- mittel; breites Integrationsgate und umfangreicher, aber fachlich begrenzter Doku-Sync.

Gefährdete bestehende Tests:

- alle Browser-Smokes durch gemeinsame Testzustände,
- Persistenz-/Migrationsfixtures,
- Coverage-Inventar und Dokumentationslinks,
- Tauri-CSP-/Quote-Pfad.

Nicht anfassen:

- produktive Fachlogik; ein entdeckter Fehler geht zurück in den verursachenden Slice,
- reale Exporte, Logs oder personenbezogene Finanzdaten,
- archivierte Dokumente außer gezielter Linkkorrektur mit Review,
- `engine.js`, `dist/`, Release-Artefakte.

Rollback-Strategie:

- auf den freigegebenen Slice-08-Commit zurück; neu angelegte Referenzdatei nur nach dokumentierter Freigabe entfernen. Fachfehler nicht durch Abschwächen von E2E-Assertions kaschieren.

## Geplante Tests und Abschlussgates

```powershell
node tests/run-single.mjs tests/persistence.test.mjs
node tests/run-single.mjs tests/profile-storage.test.mjs
node tests/run-single.mjs tests/coverage-inventory.test.mjs
node tests/run-single.mjs tests/tauri-csp.test.mjs
npm test
npm run test:browser
```

Zusätzlich bedingt:

- `npm run build:engine`, falls Slice 02/06/07 die öffentliche EngineAPI oder `engine/` nach genehmigter Neuplanung geändert hat.
- `cargo test --manifest-path src-tauri/Cargo.toml`, falls Slice 05 Rust geändert hat.
- Projektweit vorhandenes Coverage-Gate gemäß `package.json`/`tests/README.md`.
- Markdown-Link- und Sensitive-Data-Suche ohne Ausgabe realer Inhalte.

## Ergebnisse

Noch nicht umgesetzt.

## Durchgeführte Änderungen

Noch nicht umgesetzt.

## Ausgeführte Tests

Noch nicht umgesetzt.

## Abweichungen vom Plan

Keine; Umsetzung ausstehend.

## Offene Risiken

- Ein umfassender Browser-Smoke kann bei gemeinsamem Persistenzzustand flakey werden; Testprofile müssen strikt isoliert sein.
- Sanitizing darf keine weiterhin benötigte fachliche Erklärung entfernen.
- Ein Dokumentations-Sync kann bei parallelen Feature-Branches Konflikte erzeugen.

## Rückdokumentation

- Hauptplan, GAP-Analyse und alle Slices mit tatsächlichem Abschlussstand, Testbelegen und Restrisiken aktualisieren.
- Neue Tranchenreferenz in den Doku-Indizes verlinken.
- Erledigte GAPs nicht durch Codex als „freigegeben“ markieren; finale Bewertung bleibt bei Gemini/Claude/Nutzer.

## Freigabestatus

Nicht freigegeben. Gesamtsystem-, Migrations-, Doku- und finales adversariales Review ausstehend.

## Review-Feedback von Gemini

Ausstehend: vollständige Prüfdimensionen, E2E-/Migrationsversagen, Doku-Widersprüche, sensibles Datenrisiko und finales Pre-Mortem.

## Review-Feedback von Claude

Ausstehend: End-to-End-Vertrag, Fixture-Isolation, Coverage-Wirksamkeit und Referenzkonsistenz.

## Review-Antworten von Codex

Ausstehend.

## Review-Entscheidungen

| ID | Quelle | Finding | Entscheidung | Umsetzung |
| --- | --- | --- | --- | --- |
| - | - | Noch kein Review | offen | - |
