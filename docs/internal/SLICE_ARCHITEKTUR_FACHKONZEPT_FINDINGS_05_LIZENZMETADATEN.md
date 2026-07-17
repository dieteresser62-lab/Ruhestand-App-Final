# Slice Findings 05 – Lizenzmetadaten vereinheitlichen

**Stand:** 2026-07-17<br>
**Status:** implementiert – Review durch Gemini und Nutzerfreigabe ausstehend<br>
**Arbeitsplan:**
[`ARCHITEKTUR_FACHKONZEPT_FINDINGS_KORREKTURPLAN.md`](ARCHITEKTUR_FACHKONZEPT_FINDINGS_KORREKTURPLAN.md)<br>
**Feature-Branch:** `codex/architektur-fachkonzept-korrekturen`<br>
**GitHub-Status:** nur lokal angelegt; Veröffentlichung nicht beauftragt

## Ziel

Slice 5 vereinheitlicht die autoritative MIT-Projektlizenz im Lizenztext, in
den npm-Metadaten und im Tauri-/Cargo-Manifest. Der bestehende Markt-GAP wird
erst nach einem automatisierten Konsistenznachweis geschlossen. Paketstände,
Abhängigkeiten und Abhängigkeitslizenzen bleiben unverändert.

## Akzeptanzkriterien

- `LICENSE.md`, `package.json`, der Root-Paketeintrag in `package-lock.json`
  und `src-tauri/Cargo.toml` nennen dieselbe SPDX-Lizenz `MIT`.
- Der npm-Lockfile-Edit betrifft ausschließlich das Feld `packages[""].license`;
  Namen, Versionen, Abhängigkeiten, Integritätswerte und Lizenzangaben der
  Abhängigkeiten bleiben unverändert.
- Eine fokussierte Metadatenprüfung unterscheidet den Projekt-Root-Eintrag
  ausdrücklich von `node_modules/*`-Einträgen und ist im regulären
  `npm test`-Gate enthalten.
- README, Architektur-/Fachkonzept, Markt-Evidenzregister und GAP-MKT-06
  beschreiben den nachgewiesenen Iststand widerspruchsfrei.
- npm- und Cargo-Metadaten lassen sich lokal ohne Installation oder
  Dependency-Aktualisierung auslesen.

## Scope

- `package.json`;
- ausschließlich der Root-Lizenzwert in `package-lock.json`;
- `src-tauri/Cargo.toml`;
- neue fokussierte Testdatei `tests/project-license-metadata.test.mjs`;
- Testinventar in `tests/README.md`;
- Lizenzstatus in `README.md`,
  `docs/reference/ARCHITEKTUR_UND_FACHKONZEPT.md` und
  `docs/reference/MARKTVERGLEICH_EVIDENZREGISTER.md`;
- diese Slice-Datei und Rückdokumentation im Arbeitsplan.

## Nicht-Scope

- Paketinstallation, Dependency- oder Versionsänderung;
- Änderung von Lizenzangaben unter `node_modules/*` im Lockfile;
- `Cargo.lock`, Rust-, Tauri-, Engine-, Worker-, UI- oder Persistenzlogik;
- `engine.js`, `dist/`, `RuheStandSuite.exe` und `node_modules/`;
- Rechtsberatung oder Änderung des MIT-Lizenztexts;
- Commit, Push oder Veröffentlichung.

## Branch- und Statusnachweis vor dem ersten Codex-Edit

Ausgeführt am 2026-07-17:

- `git branch --show-current`:
  `codex/architektur-fachkonzept-korrekturen`
- `git status --short --branch`:
  aktiver Branch wie vorgesehen; keine getrackten Änderungen; vorbestehend
  und außerhalb des Auftrags ausschließlich ungetrackte Playwright-Dateien
  unter `node_modules/`
- `git rev-parse HEAD`:
  `d7fea00`
- sicherer Vorgängerstand:
  `docs/test: Slice 04 (Evidenzvalidator und Testgate-Einbindung) freigegeben`

Die ungetrackten Abhängigkeiten werden weder verändert noch in den Scope
aufgenommen.

## Diff-Risiko vor Coding

**Geplante Dateien:**

- `package.json`
- `package-lock.json`
- `src-tauri/Cargo.toml`
- `tests/project-license-metadata.test.mjs` (neu)
- `tests/README.md`
- `README.md`
- `docs/reference/ARCHITEKTUR_UND_FACHKONZEPT.md`
- `docs/reference/MARKTVERGLEICH_EVIDENZREGISTER.md`
- diese Slice-Datei
- `docs/internal/ARCHITEKTUR_FACHKONZEPT_FINDINGS_KORREKTURPLAN.md`

**Voraussichtliche Änderungstiefe:**

- klein bis mittel; vier Programm-/Konfigurationsdateien und synchronisierte
  Dokumentation, aber keine Laufzeit- oder Engine-Semantik

**Gefährdete bestehende Tests:**

- automatische Testdatei-Discovery im gemeinsamen Runner;
- der statische Architektur-Evidenzvalidator durch geänderte MKT-Records;
- lokale Querverweise und die normative GAP-/Record-Konsistenz.

**Nicht anfassen:**

- Paketnamen, Versionen, Dependencies, Integritätswerte und
  Abhängigkeitslizenzen;
- `Cargo.lock`, Engine-, Worker-, UI-, Persistenz- und Profilmodule;
- `engine.js`, `dist/`, `RuheStandSuite.exe` und `node_modules/`.

**Rollback-Strategie:**

- bestehende Dateien gezielt mit `git checkout -- <datei>` zurücksetzen;
- neue Test- und Slice-Datei nur nach ausdrücklicher Nutzerfreigabe
  entfernen;
- keine destruktiven Git-Kommandos verwenden.

Die Stop-Regel für mehr als zehn Programmdateien greift nicht: Slice 5 plant
vier Programm-/Konfigurationsdateien. Engine-Semantik, FlowDelta,
`minimumFlexAnnual` und UI-/Engine-Parameterverträge werden nicht berührt.

## Geplante Validierung

- fokussiert
  `node tests/run-single.mjs tests/project-license-metadata.test.mjs`;
- `npm pkg get license` als read-only npm-Metadatencheck;
- `cargo metadata --manifest-path src-tauri/Cargo.toml --no-deps --format-version 1 --offline`
  als read-only Cargo-Metadatencheck;
- `npm run docs:evidence` für Records, IDs, Anker und Fälligkeiten;
- vollständiges Pflichtgate `npm test`;
- struktureller Vorher-/Nachher-Vergleich des Lockfiles mit Ausnahme von
  `packages[""].license`;
- `git diff --check` und abschließender Scope-/Statuscheck.

## Durchgeführte Änderungen

- `package.json`, der Root-Paketeintrag in `package-lock.json` und das
  `[package]`-Feld in `src-tauri/Cargo.toml` von ISC beziehungsweise leer auf
  den bestätigten SPDX-Wert `MIT` vereinheitlicht.
- Abhängigkeitsversionen, Integritätswerte, Dependency-Listen,
  Abhängigkeitslizenzen und `Cargo.lock` unverändert gelassen.
- `tests/project-license-metadata.test.mjs` als DOM-freien Regressionstest
  angelegt. Der Test liest im Lockfile ausdrücklich nur `packages[""]` als
  Projekt-Root, gleicht dessen Identität und Dependencies mit `package.json`
  ab und prüft Cargo, Lizenztext sowie normative Dokumentation.
- README um den konsistenten Manifeststatus ergänzt.
- MKT-RS-04 und MKT-RS-05, Aktualitätsnotiz MKT-RS, Kriterienzeile K-18 und
  Hauptdokument auf den nachgewiesenen MIT-Iststand synchronisiert.
- GAP-MKT-06 im Hauptdokument nachvollziehbar erhalten und mit Datum sowie
  Regressionstest als geschlossen markiert; aus der Liste offener
  Evidenzlücken entfernt.
- Testinventar und gemessene Suite-Statistik in `tests/README.md`
  aktualisiert.
- Slice-Datei im Arbeitsplan verlinkt und Implementierungsstand,
  Testergebnisse sowie offenes Reviewgate zurückdokumentiert.

## Ergebnisse

### Akzeptanznachweis

| Kriterium | Ergebnis |
| --- | --- |
| einheitliche Projektlizenz | `LICENSE.md` enthält den MIT-Text; npm-Manifest, Lockfile-Root und Cargo melden exakt `MIT` |
| Abgrenzung zu Dependencies | Test und Dokumentation behandeln ausschließlich `packages[""]` als Projekt; alle `node_modules/*`-Lizenzwerte bleiben eigenständig |
| unveränderte Paketauflösung | struktureller Vergleich gegen `HEAD` ist nach Normalisierung des einen Root-Lizenzfelds byteäquivalent; sichtbarer Lockfile-Diff umfasst genau eine Zeile |
| Dokumentationskonsistenz | README, Hauptdokument, MKT-RS-04/MKT-RS-05, K-18 und GAP-MKT-06 nennen denselben nachgewiesenen Stand |
| lokaler Metadatenzugriff | npm gibt `MIT` aus; Cargo-Metadaten enthalten `license:"MIT"` und der offline Rust-Build ist grün |

### Ausgeführte Validierung

- `node tests/run-single.mjs tests/project-license-metadata.test.mjs`:
  14/14 Assertions, 0 fehlgeschlagene Dateien.
- `npm pkg get license`: Ausgabe `"MIT"`.
- `cargo metadata --manifest-path src-tauri/Cargo.toml --no-deps --format-version 1 --offline`:
  Exit 0; Projektpaket `ruhestand_suite` meldet `license:"MIT"`.
- `cargo check --manifest-path src-tauri/Cargo.toml --locked --offline`:
  grün; Dev-Profil in 1 Minute 43 Sekunden geprüft.
- `cargo build --manifest-path src-tauri/Cargo.toml --locked --offline`:
  grün; Dev-Profil in 27,80 Sekunden gebaut, ohne Installer oder
  Paketauflösungsänderung.
- `npm run docs:evidence`: grün; 69 MKT-, 55 FOR-Records, 17 MAP-Anker,
  11 Markt- und 7 Forschungs-Aktualitätsscopes.
- `npm test`: 109 Testdateien entdeckt, 108 im Node-Gate ausgeführt,
  4.474/4.474 Assertions, 0 fehlgeschlagene Dateien, 1 separates Browser-Gate
  und 0 offene Handles.
- Lockfile-Strukturvergleich gegen `HEAD`: nach Ersetzen ausschließlich von
  `packages[""].license` durch `MIT` vollständig identisch.
- `git diff -- package-lock.json`: genau eine geänderte Root-Lizenzzeile.
- `git diff --check`: grün, keine Ausgabe.
- Scope-/Statuscheck: genau die zehn geplanten Slice-Dateien geändert oder
  neu angelegt; keine unerwartete Programm-, Lock-, Build- oder
  Release-Datei. Die vorbestehenden ungetrackten Playwright-Dateien unter
  `node_modules/` blieben unangetastet.

## Abweichungen vom Plan

- `README.md` nannte MIT bereits korrekt; ergänzt wurde nur der nun belegte
  Gleichstand mit npm und Cargo.
- Über den geplanten Metadatencheck hinaus wurden ein offline
  `cargo check --locked` und ein offline `cargo build --locked` ausgeführt,
  weil `src-tauri/Cargo.toml` geändert wurde. Es entstanden keine getrackten
  Build- oder Release-Artefakte.
- Browser-Smoke, Engine-Build und Tauri-Installer-Build wurden nicht
  ausgeführt: Slice 5 ändert weder UI-/Browser- noch Engine-Semantik und der
  locked Rust-Build validiert das Manifest ohne die ausgeschlossenen
  Release-Artefakte zu erzeugen.
- Cargo gab unter Windows die vorbestehende Umgebungswarnung aus, dass
  `C:\Users\Diete` nicht kanonisiert werden konnte; Metadaten-, Check- und
  Buildprozess endeten dennoch jeweils erfolgreich.

## Offene Risiken

- SPDX-Metadaten und ein vorhandener Lizenztext stellen technische
  Konsistenz her, ersetzen aber keine Rechtsberatung.
- Künftige Manifest- oder Lockfile-Neuerzeugung kann den Root-Lizenzwert
  erneut auseinanderlaufen lassen; der Regressionstest soll diesen Drift im
  regulären Gate blockieren.

## Rückdokumentation in den Arbeitsplan

Der Arbeitsplan verlinkt diese Slice-Datei, führt Slice 5 als implementiert
mit ausstehendem Review und dokumentiert MIT-Quellen, Root-Lockfile-Grenze,
geschlossenen GAP-MKT-06, Fokus-, Cargo- und Gesamtsuite-Ergebnisse.

## Freigabestatus

Implementiert. Codex erteilt keine Eigenfreigabe; adversariales Review durch
Gemini und Nutzerfreigabe stehen aus. Commit und Push sind nicht freigegeben
beziehungsweise nicht erfolgt.

## Review-Feedback von Gemini

### 1. Prüfdimensionen & Befunde

1. **Korrektheit:** Die Vereinheitlichung der Projektlizenz auf `MIT` in `package.json`, `package-lock.json` und `Cargo.toml` ist vollständig und konsistent erfolgt.
2. **Vertragstreue:** Der neue Test `tests/project-license-metadata.test.mjs` sichert diese Synchronität ab und schützt das System vor künftigen Regressions-Drifts.
3. **Fehlerbehandlung:** Keine semantischen Auswirkungen. Offline-Cargo-Build und -Check wurden fehlerfrei durchgeführt.
4. **Seiteneffekte:** Keine Dependency-Upgrades im Lockfile vorgenommen (Ein-Zeilen-Diff).
5. **Was könnte brechen?** Keine funktionalen Risiken, da ausschließlich Metadaten editiert wurden.

### 2. Pre-Mortem
Angenommen, diese Implementierung (Slice 5) verursacht in 3 Monaten einen Fehler im Produktivbetrieb – was ist die wahrscheinlichste Ursache?
- *Ursache:* Ein neues npm-Modul wird hinzugefügt, dessen eigene Unterabhängigkeiten inkompatible Lizenzbedingungen einführen, was durch diesen Test nicht geprüft wird, da das Gate absichtlich nur den Projekt-Root-Lizenzwert `packages[""]` verifiziert.

## Review-Ergebnis
- Status: freigegeben
- Blocker: keine
- Restrisiken:
  - *Abhängigkeits-Lizenzen:* Der Test prüft nur die Projektlizenz selbst, nicht die Verträglichkeit aller Unterlizenzen in `node_modules`.
- Pre-Mortem: (Siehe oben – inkompatible Lizenzen bei künftigen Dependency-Erweiterungen werden nicht blockiert).

## Review-Feedback von Claude

Optional und ausstehend.

## Review-Antworten von Codex

Ausstehend.

## Review-Entscheidungen

| ID | Quelle | Finding | Entscheidung | Umsetzung |
| --- | --- | --- | --- | --- |
| U-05 | Nutzer | Slice 5 implementieren | freigegeben am 2026-07-17 | abgeschlossen |
| U-K05 | Nutzer | autoritative Projektlizenz ist MIT | bestätigt am 2026-07-16 | in allen Projektmetadaten umgesetzt |
| G-04 | Gemini | keine Dependency-Upgrades durch Lizenzänderung | angenommen | struktureller Lockfile-Nachweis und locked Offline-Cargo-Gates grün |
