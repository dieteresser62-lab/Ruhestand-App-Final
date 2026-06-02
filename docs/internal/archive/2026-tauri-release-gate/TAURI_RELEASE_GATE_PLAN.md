# Tauri-Release-Gate: Umsetzungsplan

**Stand:** 2026-05-12
**Zweck:** Arbeitsplan zur Absicherung des bewusst manuell gestarteten EXE-Release-Pfads ueber `build-tauri.bat`.
**Status:** umgesetzt / Abschlussvalidierung lokal durch defekte npm-Installation begrenzt; Archivierung nach erfolgreichem manuellem `build-tauri.bat`-Lauf.
**Scope:** Build-Skripte, `dist`-Sync, Tauri-Konfiguration, integrierter Yahoo-Proxy, Desktop-spezifische Release-Checks und Doku-Sync.
**Nicht-Scope:** Automatisierung des manuellen Release-Starts, fachliche Engine-/Steuerlogik, UI-Redesign, Veraenderung des normalen Browser-Entwicklungsablaufs.

## Ausgangspunkt

Die fachlich kritischen Slices sind abgeschlossen:

- Baseline und Gesamtvalidierung sind dokumentiert.
- Engine-/Tax-Golden-Cases sind abgesichert.
- Profilverbund-/Tranchen-Contracts sind abgesichert.
- Balance-Workflows und Diagnose-Export sind abgesichert.
- Simulator-/Worker-Paritaet ist abgesichert.

Der EXE-Build bleibt ein manueller Release-Schritt: Nach erfolgreichem Test der Suite startet der Maintainer `build-tauri.bat`. Ziel dieses Slices ist nicht, diese Entscheidung zu aendern, sondern den manuellen Schritt robuster, pruefbarer und besser dokumentiert zu machen.

## Zielbild

Der Tauri-Release-Pfad soll als klares Gate funktionieren:

```text
Tests gruen
  -> ggf. Engine-Build aktuell
  -> Maintainer startet build-tauri.bat manuell
  -> sync-dist erzeugt frisches dist/
  -> Tauri-Build erzeugt EXE
  -> Artefakt wird geprueft und kontrolliert ins Repo-Root kopiert
  -> kurze manuelle Desktop-Smoke-Checks
```

Erfolgreich ist der Slice, wenn:

- der manuelle Start ueber `build-tauri.bat` erhalten bleibt,
- Build-Voraussetzungen und haeufige Fehler frueh mit klaren Meldungen abbrechen,
- `sync-dist`-Fehler, besonders `robocopy`-Exitcodes, korrekt bewertet werden,
- `dist/` nach dem Sync auf zentrale Einstiegspunkte, Worker, Shared-Module und Assets geprueft wird,
- die Tauri-CSP gegen die aktuellen Live-Daten- und Worker-Anforderungen abgeglichen ist,
- `dangerousDisableAssetCspModification` bewusst bewertet und dokumentiert ist,
- der integrierte Yahoo-Proxy als Desktop-spezifischer Contract dokumentiert und gezielt pruefbar ist,
- die CORS-Grenze des Desktop-Proxys fuer Tauri und lokale Entwicklungsurspruenge bewusst bestaetigt oder enger gefasst ist,
- die erzeugte EXE nach Pfad, Zeitstempel und Mindestgroesse validiert wird,
- der kanonische Release-Dateiname widerspruchsfrei festgelegt ist,
- README, Technical und interne Projektuebersicht den manuellen Release-Ablauf widerspruchsfrei beschreiben.

## Relevante Dateien

| Bereich | Dateien |
| --- | --- |
| Manueller Einstieg | `build-tauri.bat` |
| Build-Orchestrierung | `scripts/build-tauri.ps1` |
| Dist-Sync | `scripts/sync-dist.ps1` |
| Package-Skripte | `package.json` |
| Tauri-Konfiguration | `src-tauri/tauri.conf.json` |
| Desktop-Proxy | `src-tauri/src/lib.rs` |
| Rust-Konfiguration | `src-tauri/Cargo.toml`, `src-tauri/Cargo.lock`, `src-tauri/build.rs` |
| Frontend-Einstiegspunkte | `index.html`, `Balance.html`, `Simulator.html`, `depot-tranchen-manager.html`, `Handbuch.html` |
| Worker/Assets | `workers/`, `app/`, `engine.js`, `css/`, `types/` |
| Referenzen | `README.md`, `docs/reference/TECHNICAL.md`, `docs/reference/DATA_SOURCES.md`, `docs/internal/PROJEKTUEBERSICHT.md`, `docs/internal/README.md` |

## Risiko- und Ertragsbewertung

| Thema | Aufwand | Aenderungsrisiko | Ertrag | Entscheidung |
| --- | --- | --- | --- | --- |
| Baseline und Ist-Aufnahme | niedrig | niedrig | hoch | zuerst angehen |
| `sync-dist`-Exitcodes | niedrig-mittel | niedrig | hoch | priorisieren |
| Dist-Vollstaendigkeit | mittel | niedrig-mittel | hoch | priorisieren |
| EXE-Artefaktpruefung | niedrig | niedrig | mittel-hoch | priorisieren |
| CSP-/Live-Daten-Abgleich | mittel | mittel | hoch | priorisieren |
| Proxy-Contract | mittel | mittel | mittel-hoch | gezielt pruefen |
| EXE-Namenskonvention | niedrig | niedrig | mittel | vor Doku-Sync klaeren |
| `DATA_SOURCES.md` Live-Daten-Scope | niedrig-mittel | niedrig | mittel-hoch | im Doku-Sync aufnehmen |
| Voller Tauri-Build | hoch/laufzeitintensiv | niedrig | hoch | als manuelles Gate validieren |
| Automatischer Release-Build nach Tests | mittel | mittel | ungewollt | explizit nicht umsetzen |

## Arbeitsprinzipien

1. Der Maintainer startet den EXE-Build weiterhin bewusst manuell ueber `build-tauri.bat`.
2. Skripte duerfen Preflight, Validierung und Fehlermeldungen verbessern, aber keinen automatischen Release-Trigger einfuehren.
3. `dist/` und `RuhestandSuite.exe` bleiben generierte Artefakte; sie werden nur im expliziten Build-/Release-Kontext angefasst.
4. Build-Skripte muessen bei Fehlern hart abbrechen und den fehlerhaften Schritt benennen.
5. Desktop-spezifische Fehler werden getrennt von fachlichen Browser-/Engine-Regressionen dokumentiert.
6. Keine sensiblen lokalen Daten, Snapshots oder Exporte in Tests oder Doku uebernehmen.

## Phase 0: Baseline und Arbeitsgrenze

**Ziel:** Aktuellen Release-Pfad und Arbeitsbaumzustand reproduzierbar erfassen.

Arbeitsschritte:

1. `git status --short` pruefen und fremde Aenderungen notieren.
2. Bestehende Build-Dateien lesen:
   - `build-tauri.bat`
   - `scripts/build-tauri.ps1`
   - `scripts/sync-dist.ps1`
   - `src-tauri/tauri.conf.json`
   - `src-tauri/src/lib.rs`
3. Package-Skripte gegen Doku abgleichen:
   - `npm test`
   - `npm run build:engine`
   - `npm run sync-dist`
   - `npm run tauri:build`
   - `npm run build-tauri-exe`
4. EXE-Namenskonvention als Ist-Stand erfassen:
   - Skriptziel `RuheStandSuite.exe`,
   - README-/Doku-Schreibweisen wie `RuhestandSuite.exe`,
   - Tauri-Produktname `RuhestandSuite`.
5. Falls Codeaenderungen geplant werden, zuerst fachliche Baseline:
   - bevorzugt `npm test`
   - bei lokalem npm-Problem ersatzweise `node tests/run-tests.mjs`

**Reviewzeitpunkt R0:** Nach Ist-Aufnahme. Entscheidung: Nur Doku-/Plan-Slice oder Script-Hardening umsetzen.

### Phase-0-Ergebnis: Baseline und Arbeitsgrenze

Phase 0 wurde am 2026-05-12 gestartet.

Arbeitsbaum-Hinweis:

- Der Arbeitsbaum enthaelt bereits offene Aenderungen aus den abgeschlossenen Simulator-, Balance-, Profilverbund-/Tranchen- und Engine-/Tax-Slices sowie den neuen Tauri-Plan.
- Git meldet weiterhin fehlenden Zugriff auf `C:\Users\Diete\.config\git\ignore`, ohne die Tests zu blockieren.

Ist-Aufnahme:

- `build-tauri.bat` delegiert direkt an `scripts/build-tauri.ps1`.
- `scripts/build-tauri.ps1` prueft bereits `npm`, `rustup`, `cargo`, MSVC/Rust-Host und kopiert nach erfolgreichem Build die EXE ins Repo-Root.
- `scripts/build-tauri.ps1` prueft nach `sync-dist` aktuell nur `dist/types/strategy-options.js` und `dist/types/profile-types.js`.
- `scripts/sync-dist.ps1` nutzt `robocopy`, wertet dessen Exitcode aber noch nicht explizit aus.
- `src-tauri/tauri.conf.json` laedt `../dist`, erlaubt lokale Proxy-Ziele, ECB, World Bank, OECD und `r.jina.ai`, und setzt `dangerousDisableAssetCspModification: true`.
- `src-tauri/src/lib.rs` startet den Yahoo-Proxy auf `127.0.0.1:8787` und erlaubt Tauri- sowie lokale `localhost`-/`127.0.0.1`-Origins.

Package-Skripte:

- `npm test` -> `node tests/run-tests.mjs`
- `npm run build:engine` -> `node build-engine.mjs`
- `npm run sync-dist` -> `powershell -NoProfile -ExecutionPolicy Bypass -File scripts/sync-dist.ps1`
- `npm run tauri:build` -> `tauri build`
- `npm run build-tauri-exe` -> `powershell -NoProfile -ExecutionPolicy Bypass -File scripts/build-tauri.ps1`

EXE-Namensbefund:

- README und `docs/reference/TECHNICAL.md` verwenden `RuhestandSuite.exe`.
- `scripts/build-tauri.ps1` kopiert aktuell nach `RuheStandSuite.exe`.
- `docs/internal/PROJEKTUEBERSICHT.md` enthaelt beide Schreibweisen.
- Tauri-Produktname ist `RuhestandSuite`.

Baseline:

```bash
npm test
```

Ergebnis: blockiert durch lokale npm-Installation; `npm-cli.js` unter `C:\Users\Diete\AppData\Roaming\npm\node_modules\npm\bin\npm-cli.js` fehlt.

Fallback gemaess Plan:

```bash
node tests/run-tests.mjs
```

Ergebnis: gruen mit 74 Testdateien / 1639 Assertions / 0 Fehlern.

**R0-Entscheidung:** Weiter mit Script-Hardening. Phase 2 und 3 sind die naechsten sinnvollen Umsetzungsschritte; Phase 1 wird parallel durch die dokumentierte Contract-Entscheidung und die EXE-Namensvereinheitlichung konkretisiert.

## Phase 1: Build-Gate-Contract definieren

**Ziel:** Klar festlegen, was `build-tauri.bat` garantiert und was bewusst Voraussetzung bleibt.

Zu dokumentieren:

| Contract | Entscheidung |
| --- | --- |
| Start | Maintainer startet manuell nach gruenem Suite-Test. |
| Testnachweis | Skript kann optional warnen oder nach Marker fragen, ersetzt aber nicht die bewusste Testentscheidung. |
| Engine-Build | Wenn `engine/` oder `EngineAPI` geaendert wurde, muss vor Release `npm run build:engine` gelaufen sein. |
| Dist | `dist/` wird im Build frisch durch `npm run sync-dist` erzeugt. |
| Artefakt | Nur eine erfolgreich gebaute EXE wird nach dem kanonischen Release-Dateinamen kopiert; Schreibweise und Doku muessen uebereinstimmen. |
| Fehler | Jeder Fehler bricht ab; kein stilles Weiterbauen nach Teilfehlern. |
| Smoke | Nach dem Build folgen manuelle Desktop-Smoke-Checks. |

Moegliches Artefakt:

- Abschnitt in diesem Plan plus Doku-Sync in `README.md` / `TECHNICAL.md`.

**Reviewzeitpunkt R1:** Entscheidung, ob ein Testmarker technisch umgesetzt wird oder ob der Testnachweis bewusst rein prozessual bleibt.

### Phase-1-Ergebnis: Build-Gate-Contract

Phase 1 wurde am 2026-05-12 abgeschlossen.

Entscheidungen:

- Der EXE-Build bleibt ein bewusst manuell gestarteter Release-Schritt ueber `build-tauri.bat`.
- Es wird kein technischer Testmarker eingefuehrt. Der Testnachweis bleibt bewusst prozessual: Vor dem Release-Gate muss die Suite gruen gelaufen sein; wenn `npm test` lokal blockiert ist, ist `node tests/run-tests.mjs` der dokumentierte Fallback.
- `build-tauri.bat` garantiert kuenftig nur den Release-Build ab seinem Startpunkt: Preflight, frischen `dist`-Sync, Tauri-Build, Artefaktpruefung, kontrollierte Kopie und Abschlussmeldung.
- `build-tauri.bat` ersetzt nicht die fachliche Testentscheidung und startet keine automatische Release-Kette nach Tests.
- Kanonischer EXE-Dateiname fuer Doku und Zielkopie wird `RuhestandSuite.exe`, passend zu `src-tauri/tauri.conf.json` `productName = "RuhestandSuite"` und README/Technical.
- Die aktuell vorhandene Datei `RuheStandSuite.exe` und der aktuelle Skriptzielname werden als bestehender Iststand behandelt; die Vereinheitlichung erfolgt in Phase 3/7 im Build-Skript und Doku-Sync.

Contract-Matrix:

| Contract | Ergebnis |
| --- | --- |
| Start | Maintainer startet `build-tauri.bat` manuell nach gruenem Suite-Test. |
| Testnachweis | Prozessual, kein Markerfile und keine automatische Testausfuehrung im Build-Skript. |
| Engine-Build | Bei Engine-/`EngineAPI`-Aenderungen muss `npm run build:engine` vor Release gelaufen sein; bei npm-Blocker ist der Befund zu dokumentieren. |
| Dist | `dist/` wird im Release-Build frisch durch `npm run sync-dist` erzeugt und danach geprueft. |
| Artefakt | Nur eine erfolgreich erzeugte und plausibilisierte Tauri-EXE wird nach `RuhestandSuite.exe` kopiert. |
| Fehler | Jeder Teilfehler bricht den Build ab; kein stilles Weiterbauen nach `sync-dist`-, Tauri- oder Kopierfehlern. |
| Smoke | Nach dem Build folgt eine manuelle Desktop-Smoke-Checkliste. |

**R1-Entscheidung:** Weiter mit Phase 2, `sync-dist` robuster machen. Die technische Umsetzung des kanonischen Dateinamens erfolgt mit der Build-Orchestrierung in Phase 3.

## Phase 2: `sync-dist` robuster machen

**Ziel:** `dist/` wird frisch, vollstaendig und mit korrekter Fehlerbehandlung erzeugt.

Geplante Pruefpunkte:

1. `robocopy`-Exitcodes korrekt interpretieren:
   - 0 bis 7 sind uebliche Erfolg-/Aenderungscodes,
   - >= 8 ist Fehler und muss abbrechen.
2. `Start-Process` so verwenden, dass der Exitcode sichtbar ausgewertet wird.
3. Zentrale Excludes pruefen:
   - `dist`, `node_modules`, `src-tauri`, `.git`, Agent-/Tooling-Verzeichnisse, `docs`, `tests`, `scripts`.
4. Keine Release-Artefakte in `dist/` kopieren:
   - `*.exe`, `*.msi`, Archive.
5. Mindestdateien nach Sync pruefen:
   - HTML-Einstiegspunkte,
   - `engine.js`,
   - `app/`,
   - `workers/`,
   - `types/`,
   - zentrale CSS-Dateien,
   - Tauri-relevante Assets.

Moegliche Dateien:

- `scripts/sync-dist.ps1`
- ggf. neuer Helper unter `scripts/`, falls die Pruefliste zu gross wird.

Validierung:

```bash
npm run sync-dist
```

**Reviewzeitpunkt R2:** Nach `sync-dist`-Pruefung. Entscheidung: Build-Skript kann sich auf `dist` verlassen oder braucht weitere Checks.

### Phase-2-Ergebnis: `sync-dist`-Hardening

Phase 2 wurde am 2026-05-12 umgesetzt.

Umgesetzte Aenderungen in `scripts/sync-dist.ps1`:

- `$ErrorActionPreference = 'Stop'` gesetzt.
- `robocopy` wird mit `-PassThru` gestartet und der Exitcode explizit ausgewertet.
- `robocopy`-Exitcodes `0..7` gelten als erfolgreiche bzw. nicht-fatal geaenderte Kopierlaeufe.
- `robocopy`-Exitcodes `>= 8` brechen den Sync mit klarer Fehlermeldung ab.
- Nach dem Sync werden zentrale Pflichtpfade validiert:
  - HTML-Einstiegspunkte,
  - `engine.js`,
  - `app/`-Teilbereiche,
  - `workers/worker-pool.js` und `workers/mc-worker.js`,
  - `types/strategy-options.js` und `types/profile-types.js`,
  - `css/balance.css` und `simulator.css`.
- Ausgeschlossene Verzeichnisse werden nach dem Sync als Negativliste geprueft.
- Release-Artefakte (`*.exe`, `*.msi`, Archive) in `dist/` brechen den Sync ab.

Zusaetzlicher Befund waehrend der Validierung:

- Der erste erfolgreiche `robocopy`-Lauf zeigte, dass lokale Arbeits-/Cache-Verzeichnisse wie `.coverage`, `.orchestrator`, `.pytest_cache`, `audit`, `inbox`, `outbox`, `Presentation` und `Screenshots` bislang in `dist/` gelangen konnten.
- Diese Verzeichnisse wurden in die Exclude- und Negativliste aufgenommen.

Validierung:

```bash
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/sync-dist.ps1 -VerboseMode
```

Ergebnis:

- `robocopy` lief mit Exitcode 1, also erfolgreicher Kopierlauf mit Aenderungen.
- `dist`-Validierung lief gruen.
- `dist` enthaelt keine verbotenen Release-Artefakte.
- `dist` enthaelt keine ausgeschlossenen lokalen Arbeits-/Cache-/Dokumentations-/Testverzeichnisse.

Hinweise:

- Der erste nicht-eskalierte Lauf wurde durch Zugriff auf vorhandene `dist/.orchestrator`-Dateien blockiert. Der validierte Sync lief anschliessend im expliziten Release-/`dist`-Kontext mit Berechtigung und erzeugte `dist/` neu.
- `git diff --check` fuer `scripts/sync-dist.ps1` und diesen Plan ist sauber.

**R2-Entscheidung:** Phase 2 ist abgeschlossen. Weiter mit Phase 3, Build-Orchestrierung absichern und den kanonischen Zielnamen `RuhestandSuite.exe` technisch umsetzen.

## Phase 3: Build-Orchestrierung absichern

**Ziel:** `scripts/build-tauri.ps1` bricht bei fehlenden Voraussetzungen und defekten Artefakten klar ab.

Bestehende Basis:

- `npm`, `rustup`, `cargo`, `rustc -vV` und MSVC werden bereits geprueft.
- Visual-Studio-Dev-Umgebung wird bei Bedarf geladen.
- `sync-dist` und `tauri:build` werden orchestriert.
- `src-tauri\target\release\ruhestand_suite.exe` wird nach `RuheStandSuite.exe` kopiert.

Geplante Verbesserungen:

1. Exitcode von `npm run sync-dist` und `npm run tauri:build` explizit pruefen.
2. Nach `sync-dist` eine zentrale Dist-Pruefliste aus Phase 2 verwenden.
3. EXE-Artefakt pruefen:
   - existiert,
   - Zeitstempel liegt nach Build-Start,
   - Mindestgroesse plausibel,
   - Zielkopie hat denselben Zeitstempel oder dieselbe Groesse.
4. Kanonischen Zielnamen festlegen und verwenden:
   - aktuelle Skriptschreibweise `RuheStandSuite.exe`,
   - Doku-/Produktname `RuhestandSuite`,
   - keine gemischten Schreibweisen in README/Technical/Projektuebersicht.
5. Bestehende Ziel-EXE nur nach erfolgreichem Source-Artefakt ueberschreiben.
6. Am Ende kurze Zusammenfassung ausgeben:
   - Quell-EXE,
   - Ziel-EXE,
   - Groesse,
   - Build-Zeitpunkt,
   - Hinweis auf manuelle Smoke-Checks.

Moegliche Dateien:

- `scripts/build-tauri.ps1`
- `build-tauri.bat` nur, falls Parameterweitergabe oder Textausgabe verbessert werden muss.

Validierung:

```bash
npm run build-tauri-exe
```

oder bewusst manuell:

```bash
build-tauri.bat
```

**Reviewzeitpunkt R3:** Nach Build-Orchestrierungscheck. Entscheidung: voller Tauri-Build ausfuehren oder nur Skriptlogik dokumentieren, wenn lokale Voraussetzungen fehlen.

### Phase-3-Ergebnis: Build-Orchestrierung

Phase 3 wurde am 2026-05-12 umgesetzt.

Umgesetzte Aenderungen in `scripts/build-tauri.ps1`:

- Kanonischer Zielname auf `RuhestandSuite.exe` gesetzt.
- `Assert-NpmUsable()` ergaenzt:
  - `npm` muss nicht nur im `PATH` liegen, sondern `npm --version` erfolgreich ausfuehren.
  - Eine defekte npm-Installation bricht im Preflight mit klarer Meldung ab.
- `Invoke-CheckedCommand()` ergaenzt:
  - native Kommandos werden mit Output-Sammlung ausgefuehrt,
  - Nicht-Null-Exitcodes brechen mit Schrittname, Exitcode und Output ab.
- `npm run sync-dist` und `npm run tauri:build` laufen nun ueber `Invoke-CheckedCommand()`.
- `Assert-DistReady()` spiegelt die Phase-2-Pflicht- und Negativpruefungen im Build-Orchestrator.
- `Assert-ReleaseExecutable()` ergaenzt:
  - Source-EXE muss existieren,
  - Source-EXE muss nach Build-Start aktualisiert worden sein,
  - Source-EXE und Ziel-EXE muessen eine plausible Mindestgroesse haben,
  - Zielkopie muss die Source-Groesse behalten.
- Abschlussausgabe nennt Ziel-EXE, Groesse, Zeitstempel und erinnert an manuelle Desktop-Smoke-Checks.

Validierung:

```bash
powershell -NoProfile -Command "... [scriptblock]::Create(...) ..."
git diff --check -- scripts/build-tauri.ps1 scripts/sync-dist.ps1 docs/internal/2026-tauri-release-gate/TAURI_RELEASE_GATE_PLAN.md
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/build-tauri.ps1 -VerboseMode
```

Ergebnis:

- PowerShell-Syntax ist gueltig.
- `git diff --check` ist sauber; Git meldet nur CRLF-Hinweise fuer die PowerShell-Dateien.
- Der Build-Orchestrator bricht erwartungsgemaess im Preflight ab, weil die lokale npm-Installation defekt ist:
  - `npm --version` findet `C:\Users\Diete\AppData\Roaming\npm\node_modules\npm\bin\npm-cli.js` nicht.
  - Der Fehler wird jetzt als klarer Preflight-Fehler gemeldet statt erst waehrend `npm run sync-dist` oder `npm run tauri:build`.

Nicht ausgefuehrt:

- Voller Tauri-Build, weil `npm` lokal nicht nutzbar ist und der Build-Gate-Contract npm als Voraussetzung beibehaelt.

**R3-Entscheidung:** Phase 3 ist abgeschlossen. Weiter mit Phase 4, Tauri-Konfiguration und CSP abgleichen. Fuer die spaetere Abschlussvalidierung muss entweder npm repariert sein oder der blockierende npm-Befund ausdruecklich bestehen bleiben.

## Phase 4: Tauri-Konfiguration und CSP abgleichen

**Ziel:** Desktop-Konfiguration deckt aktuelle Frontend- und Live-Datenanforderungen ab.

Pruefpunkte:

1. `build.frontendDist` zeigt auf `../dist`.
2. Fensterkonfiguration entspricht README/Technical.
3. `connect-src` enthaelt genau die aktuell benoetigten Ziele:
   - lokale Proxy-Ziele `127.0.0.1:8787` und `localhost:8787`,
   - ECB,
   - World Bank,
   - OECD,
   - `r.jina.ai`.
4. `worker-src` erlaubt Worker fuer Monte-Carlo, Sweep und Auto-Optimize.
5. `script-src` und `style-src` sind dokumentiert begruendet, falls sie wegen bestehender Inline-Skripte/-Styles breit bleiben muessen.
6. `dangerousDisableAssetCspModification` ist bewusst bewertet:
   - warum das Flag aktuell gesetzt ist,
   - welche Risiken dadurch bestehen,
   - ob eine engere Tauri-CSP-Integration realistisch ist oder bewusst vertagt wird.
7. Icons und Bundle-Ziele existieren.
8. Keine neue externe Quelle wird stillschweigend erlaubt.

Moegliche Dateien:

- `src-tauri/tauri.conf.json`
- `README.md`
- `docs/reference/TECHNICAL.md`
- `docs/reference/DATA_SOURCES.md`

Validierung:

```bash
npm run tauri:build
```

**Reviewzeitpunkt R4:** Nach CSP-/Config-Abgleich. Entscheidung: Doku reicht oder Konfiguration muss korrigiert werden.

### Phase-4-Ergebnis: Tauri-Konfiguration und CSP

Phase 4 wurde am 2026-05-12 umgesetzt.

Bewertung `src-tauri/tauri.conf.json`:

- `build.frontendDist = "../dist"` ist korrekt fuer den Release-Pfad.
- Fensterbasis bleibt `1920x1080`, resizable, und entspricht der aktiven technischen Referenz.
- `connect-src` enthaelt die aktuell benoetigten optionalen Live-Datenziele:
  - `http://127.0.0.1:8787`,
  - `http://localhost:8787`,
  - `https://data-api.ecb.europa.eu`,
  - `https://api.worldbank.org`,
  - `https://stats.oecd.org`,
  - `https://r.jina.ai`.
- `worker-src 'self' blob:` deckt gebuendelte Worker und Blob-Fallbacks fuer Monte-Carlo, Sweep und Auto-Optimize ab.
- Bundle-Icons aus `tauri.conf.json` existieren.
- Keine neue externe Quelle wurde erlaubt.

Bewertung CSP-Breite:

- `script-src` enthaelt weiterhin `unsafe-inline` und `unsafe-eval`.
- `style-src` enthaelt weiterhin `unsafe-inline`.
- Diese Breite wird nicht erweitert; sie bleibt wegen bestehender HTML-/Modul-Patterns dokumentiert.
- `dangerousDisableAssetCspModification: true` bleibt gesetzt und ist jetzt dokumentiert: Die handgepflegte CSP aus `tauri.conf.json` soll unveraendert gelten und nicht durch Tauri-Asset-Rewrites erweitert werden.

Umgesetzte Aenderungen:

- `tests/tauri-csp.test.mjs`
  - erweitert um `frontendDist`, Produktname, Fensterbasis, `localhost:8787`, Worker-Policy, Script-/Style-/Font-Policy, `dangerousDisableAssetCspModification` und Icon-Pfade.
- `docs/reference/TECHNICAL.md`
  - Tauri-CSP, Worker-Policy und bewusst gesetztes `dangerousDisableAssetCspModification` dokumentiert.
- `docs/reference/DATA_SOURCES.md`
  - optionale Live-Datenquellen, Proxy-Rollen und Tauri-`connect-src`-Bezug ergaenzt.

Validierung:

```bash
node tests/run-single.mjs tests/tauri-csp.test.mjs
```

Ergebnis: gruen.

Nicht ausgefuehrt:

- `npm run tauri:build`, weil die lokale npm-Installation weiterhin defekt ist.

**R4-Entscheidung:** Phase 4 ist abgeschlossen. Tauri-Konfiguration muss in diesem Slice nicht geaendert werden; die bestehenden CSP-Entscheidungen sind jetzt test- und dokumentationsseitig abgesichert. Weiter mit Phase 5, Yahoo-Proxy-Contract pruefbar machen.

## Phase 5: Yahoo-Proxy-Contract pruefbar machen

**Ziel:** Der integrierte Desktop-Proxy bleibt fuer ETF-Kurse nachvollziehbar und getrennt vom Browser-Proxy.

Pruefpunkte:

1. Proxy startet auf `127.0.0.1:8787`.
2. Erlaubte Origins sind auf Tauri und lokale Entwicklungsurspruenge begrenzt.
3. Die aktuelle Freigabe beliebiger lokaler Ports (`localhost:*`, `127.0.0.1:*`) wird bewertet:
   - fuer lokale Browser-Entwicklung plausibel,
   - fuer Release bewusst dokumentieren oder enger fassen,
   - keine externe Origin erlauben.
4. Endpunkte bleiben dokumentiert:
   - `/quote?symbol=...`
   - `/search?q=...`
   - `/chart?symbol=...&period1=...&period2=...&interval=...`
5. Fehlerfaelle liefern JSON mit passendem Status:
   - fehlender Parameter,
   - Yahoo nicht erreichbar,
   - kein Preis gefunden.
6. GBP/GBX-Normalisierung bleibt dokumentiert.
7. Port-Konflikt wird sichtbar geloggt und blockiert nicht die ganze App ohne Hinweis.

Moegliche Dateien:

- `src-tauri/src/lib.rs`
- ggf. `docs/reference/DATA_SOURCES.md`
- ggf. `README.md`

Validierung:

- Rust-/Tauri-Build als Compile-Check.
- Optionaler manueller Check nach EXE-Start:

```text
http://127.0.0.1:8787/quote?symbol=VWCE.DE
```

**Reviewzeitpunkt R5:** Entscheidung, ob reine Dokumentation reicht oder kleine Proxy-Tests/Smoke-Hinweise sinnvoll sind.

### Phase-5-Ergebnis: Yahoo-Proxy-Contract

Phase 5 wurde am 2026-05-12 umgesetzt.

Bewertung `src-tauri/src/lib.rs`:

- Der integrierte Proxy bindet nur auf `127.0.0.1:8787`.
- Unterstuetzte Endpunkte bleiben:
  - `/quote?symbol=...`,
  - `/search?q=...`,
  - `/chart?symbol=...&period1=...&period2=...&interval=...`.
- Fehlerfaelle bleiben JSON-basiert:
  - fehlende Parameter: `400`,
  - kein Preis: `404`,
  - Upstream-/Fetch-/JSON-Fehler: `502`.
- Port-Konflikt wird geloggt; die Tauri-App startet weiter, nur ETF-Live-Kurse ueber den integrierten Proxy koennen dann ausfallen.
- CORS-Entscheidung:
  - Tauri-Urspruenge und lokale `localhost`-/`127.0.0.1`-Urspruenge bleiben erlaubt.
  - Externe Origins erhalten `Access-Control-Allow-Origin: null`.
  - Die Freigabe lokaler Ports bleibt bewusst erhalten, weil sie lokale Entwicklungs- und WebView-Urspruenge abdeckt; der Proxy exponiert keine Secrets und bindet nur an Loopback.

Umgesetzte Aenderungen:

- `src-tauri/src/lib.rs`
  - Rust-Unit-Tests fuer CORS-Allowlist/-Denylist, Query-Decoding, Quote-/Chart-Preisextraktion und GBp/GBX-Normalisierung ergaenzt.
- `docs/reference/TECHNICAL.md`
  - Proxy-Contract mit Bind-Adresse, Endpunkten, CORS, Fehlerstatus, GBp/GBX-Normalisierung und Portkonflikt-Verhalten dokumentiert.

Validierung:

```bash
cargo test
```

Ergebnis:

- Nach initialem Compile-Timeout beim ersten Lauf lief der zweite Lauf gruen.
- 5 Rust-Unit-Tests bestanden.

Nicht ausgefuehrt:

- Manueller Live-Check `http://127.0.0.1:8787/quote?symbol=VWCE.DE`, weil dafuer die Tauri-App bzw. der integrierte Proxy gestartet werden muss und der volle Build wegen lokal defektem npm weiterhin blockiert ist.

**R5-Entscheidung:** Phase 5 ist abgeschlossen. Weiter mit Phase 6, manuelle Desktop-Smoke-Checkliste dauerhaft dokumentieren.

## Phase 6: Manuelle Desktop-Smoke-Checkliste

**Ziel:** Nach erfolgreichem EXE-Build gibt es eine kurze, wiederholbare Desktop-Pruefung.

Checkliste:

1. EXE startet ohne separates lokales Webserver-Setup.
2. Startseite `index.html` laedt Profilverwaltung.
3. Balance-App laedt, Engine-Version/Handshake ist sichtbar oder ohne Fehler.
4. Simulator laedt und ein kleiner Smoke-Lauf startet ohne Worker-Fehler.
5. Tranchenmanager laedt vorhandene synthetische oder leere Daten ohne Fehler.
6. Handbuch laedt.
7. Jahresupdate-Fallbacks bleiben nutzbar:
   - ohne Internet kein harter App-Abbruch,
   - mit Internet funktionieren Inflation/CAPE/ETF-Kurs nach Moeglichkeit.
8. Worker-basierte Pfade starten aus der EXE:
   - Monte-Carlo,
   - Sweep,
   - Auto-Optimize, falls sinnvoll klein konfiguriert.
9. Keine Console-/Log-Fehler, die auf fehlende Assets in `dist/` hindeuten.

Artefakt:

- Checkliste in README/Technical oder in diesem Plan; keine sensiblen lokalen Testdaten verwenden.

**Reviewzeitpunkt R6:** Nach erster Anwendung der Checkliste. Entscheidung: Welche Punkte gehoeren dauerhaft in die aktive Doku.

### Phase-6-Ergebnis: Desktop-Smoke-Checkliste

Phase 6 wurde am 2026-05-12 umgesetzt.

Umgesetzte Aenderung:

- `docs/reference/TECHNICAL.md`
  - dauerhafte manuelle Desktop-Smoke-Checkliste nach `build-tauri.bat` ergaenzt.

Checkliste in der aktiven Doku:

1. EXE startet ohne separates lokales Webserver- oder Node-Proxy-Setup.
2. Startseite/Profilverwaltung laedt.
3. Balance-App laedt, fuehrt eine Aktualisierung aus und zeigt keine Asset-/Engine-Fehler.
4. Simulator laedt; ein kleiner Monte-Carlo- oder Backtest-Smoke-Lauf startet ohne Worker-Fehler.
5. Tranchenmanager laedt leere oder synthetische Tranchen ohne Fehler.
6. Handbuch laedt.
7. Optionaler Live-Daten-Check mit Internet: ETF-Kurs via integriertem Proxy, Inflation/CAPE via freigegebene Endpunkte.
8. Optionaler Offline-Check: Ohne Internet darf die App nicht hart abbrechen; Live-Daten-Fetches muessen als Fallback/Warnung degradieren.
9. Keine Log-/Console-Hinweise auf fehlende `dist`-Assets oder blockierte Worker.

Nicht ausgefuehrt:

- Praktische Anwendung der Checkliste an einer frisch gebauten EXE, weil der volle Tauri-Build weiterhin durch die lokale npm-Installation blockiert ist.

**R6-Entscheidung:** Phase 6 ist dokumentarisch abgeschlossen. Die erste praktische Anwendung erfolgt beim naechsten erfolgreichen manuellen `build-tauri.bat`-Lauf. Weiter mit Phase 7, Doku-Sync und Abschlussstatus.

## Phase 7: Doku-Sync und Abschluss

**Ziel:** Release-Pfad ist in aktiver Doku widerspruchsfrei.

Zu pruefen:

1. `README.md`
   - EXE-Build bleibt manuell via `build-tauri.bat`.
   - Voraussetzungen und Reihenfolge sind klar.
   - Browser-Variante vs. Tauri-EXE sind getrennt beschrieben.
2. `docs/reference/TECHNICAL.md`
   - `dist/` als Build-Input,
   - Tauri-CSP,
   - Yahoo-Proxy,
   - Release-Gate.
3. `docs/reference/DATA_SOURCES.md`
   - Live-Datenquellen und Proxy-Rollen,
   - Yahoo ueber lokalen Desktop-/Browser-Proxy,
   - ECB, World Bank und OECD fuer Inflation,
   - CAPE/Yale-Mirror via `r.jina.ai`,
   - Abgrenzung zwischen historischen Simulator-Daten und optionalen Live-Daten.
4. `docs/internal/PROJEKTUEBERSICHT.md`
   - Tauri-Punkt als aktiv oder umgesetzt markieren.
5. `docs/internal/README.md`
   - aktiven Plan aufnehmen.
6. Nach Abschluss:
   - Plan nach `docs/internal/archive/2026-tauri-release-gate/` verschieben,
   - `docs/internal/archive/README.md` aktualisieren.

Abschlussvalidierung:

```bash
npm test
npm run sync-dist
build-tauri.bat
git diff --check
```

Falls der volle Tauri-Build lokal nicht moeglich ist, muss der Grund dokumentiert werden, z.B. fehlendes MSVC/Rust/Tauri-Setup.

**Reviewzeitpunkt R7:** Abschlussentscheidung und Archivierung.

### Phase-7-Ergebnis: Doku-Sync und Abschlussstatus

Phase 7 wurde am 2026-05-12 umgesetzt.

Umgesetzte Doku-Syncs:

- `README.md`
  - beschreibt den Windows-Release-Build als bewusst manuellen Schritt ueber `build-tauri.bat` nach gruener Suite,
  - nennt den frischen `dist`-Sync, Asset-Validierung, Tauri-Build und die plausibilisierte Zielkopie `RuhestandSuite.exe`,
  - dokumentiert `node tests/run-tests.mjs` als fachlichen Fallback bei lokal defektem `npm`, ohne die npm-Voraussetzung fuer den Tauri-Release-Build aufzuweichen,
  - verweist auf den manuellen Desktop-Smoke nach dem EXE-Build.
- `docs/reference/TECHNICAL.md`
  - dokumentiert Tauri-CSP, Worker-Policy, `dangerousDisableAssetCspModification`, integrierten Yahoo-Proxy und Desktop-Smoke-Checkliste.
- `docs/reference/DATA_SOURCES.md`
  - grenzt optionale Live-Datenquellen von historischen Simulator-Daten ab,
  - dokumentiert Yahoo ueber lokalen Proxy sowie ECB, World Bank, OECD und `r.jina.ai` als Tauri-`connect-src`-relevante Ziele.
- `docs/internal/PROJEKTUEBERSICHT.md`
  - vereinheitlicht den kanonischen EXE-Namen auf `RuhestandSuite.exe`,
  - markiert den Tauri-Release-Gate-Punkt als umgesetzt mit lokal blockierter Build-Validierung,
  - verlinkt dieses Detailprotokoll als aktiven Abschlussnachweis.
- `tests/README.md`
  - dokumentiert den erweiterten `tauri-csp.test.mjs` als Contract-Test fuer Tauri-Release-Konfiguration und CSP.
- `docs/internal/README.md`
  - fuehrt diesen Plan weiterhin als aktiven Plan, weil die praktische Archivierungsbedingung noch nicht erfuellt ist.

Validierung:

```bash
node tests/run-single.mjs tests/tauri-csp.test.mjs
cargo test
node tests/run-tests.mjs
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/sync-dist.ps1 -VerboseMode
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/build-tauri.ps1 -VerboseMode
```

Ergebnisse:

- `tests/tauri-csp.test.mjs` laeuft gruen.
- `cargo test` laeuft gruen mit 5 Rust-Unit-Tests.
- `node tests/run-tests.mjs` laeuft gruen mit 74 Testdateien / 1659 Assertions / 0 Fehlern.
- Der direkte `scripts/sync-dist.ps1`-Lauf lief gruen; `robocopy` beendete mit Exitcode 1 und die `dist`-Validierung lief erfolgreich.
- `scripts/build-tauri.ps1` bricht wie vorgesehen im Preflight ab, weil die lokale npm-Installation defekt ist:
  - `C:\Users\Diete\AppData\Roaming\npm\node_modules\npm\bin\npm-cli.js` fehlt.
  - Der Fehler ist jetzt frueh und eindeutig als npm-Preflight-Fehler sichtbar.

Nicht abgeschlossen:

- `npm test`, `npm run sync-dist` und `build-tauri.bat` konnten ueber den normalen npm-Pfad nicht vollstaendig ausgefuehrt werden, weil `npm` lokal nicht nutzbar ist; der direkte PowerShell-`sync-dist`-Pfad wurde ersatzweise validiert.
- Die erste praktische Anwendung der Desktop-Smoke-Checkliste an einer frisch gebauten `RuhestandSuite.exe` steht bis zur npm-Reparatur aus.

**R7-Entscheidung:** Umsetzung abgeschlossen, aber noch nicht archivieren. Der Plan bleibt aktiv, bis lokal `npm` repariert ist, `build-tauri.bat` erfolgreich durchlaeuft und der manuelle Desktop-Smoke dokumentiert wurde.

## Test- und Validierungsplan

### Pflicht vor Script-/Config-Aenderungen

```bash
npm test
```

### Bei Engine-Aenderungen

```bash
npm run build:engine
npm test
```

### Bei `sync-dist`-Aenderungen

```bash
npm run sync-dist
```

Zusatzpruefung:

- existieren alle Mindestdateien in `dist/`,
- keine ausgeschlossenen Verzeichnisse wurden kopiert,
- keine EXE/Archive liegen in `dist/`.

### Bei Build-Skript- oder Tauri-Konfigurationsaenderungen

```bash
build-tauri.bat
```

oder:

```bash
npm run build-tauri-exe
```

### Abschluss

```bash
npm test
build-tauri.bat
git diff --check
```

## Review-Checkliste

- [ ] Bleibt der EXE-Build ein bewusst manuell gestarteter Schritt?
- [ ] Bricht `sync-dist` bei echten `robocopy`-Fehlern ab?
- [ ] Wird `dist/` nach dem Sync auf zentrale Dateien geprueft?
- [ ] Bricht `build-tauri.ps1` bei fehlerhaftem `npm run sync-dist` oder `npm run tauri:build` ab?
- [ ] Wird die erzeugte EXE vor dem Kopieren plausibilisiert?
- [ ] Ist der kanonische EXE-Dateiname in Skript und Doku eindeutig?
- [ ] Sind CSP und Live-Datenziele aktuell und begrenzt?
- [ ] Ist `dangerousDisableAssetCspModification` bewusst bewertet?
- [ ] Ist der integrierte Yahoo-Proxy vom Browser-Proxy sauber abgegrenzt?
- [ ] Ist die CORS-Freigabe lokaler Origins fuer Entwicklung/Release bewusst entschieden?
- [ ] Dokumentiert `DATA_SOURCES.md` die optionalen Live-Datenquellen und Proxy-Rollen?
- [ ] Sind Worker-Assets fuer Tauri beruecksichtigt?
- [ ] Sind README, Technical und Projektuebersicht widerspruchsfrei?
- [ ] Ist `git diff --check` sauber?
- [ ] Wurde dokumentiert, falls der Tauri-Build lokal nicht ausgefuehrt werden konnte?

## Abbruch- und Eskalationskriterien

Die Umsetzung sollte pausiert und neu bewertet werden, wenn:

- der lokale Tauri-Build wegen fehlender Toolchain nicht moeglich ist und kein sinnvoller Teilcheck mehr offen ist,
- eine CSP-Aenderung eine neue externe Datenquelle erlauben wuerde, ohne dass sie fachlich dokumentiert ist,
- ein Proxy-Fix externe Netzwerkannahmen oder API-Vertraege neu definieren muesste,
- `dist/`-Aenderungen versehentlich generierte Artefakte als Quellcode behandeln wuerden,
- der Plan in Richtung automatischer Release-Ausloesung kippt, obwohl der manuelle Start gewuenscht ist.
