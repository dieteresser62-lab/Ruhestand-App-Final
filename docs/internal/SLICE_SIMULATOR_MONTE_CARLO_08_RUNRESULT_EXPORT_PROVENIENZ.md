# Slice 08: RunResult, Export und Provenienz

**Stand:** 2026-07-22
**Status:** Implementierung abgeschlossen; Gemini-/Nutzerreview ausstehend
**Feature-Branch:** `codex/simulator-monte-carlo-gap-plan`  
**GitHub-Status:** nur lokal; Veroeffentlichung ausstehend  
**Arbeitsplan:** [SIMULATOR_MONTE_CARLO_HARDENING_PLAN.md](./SIMULATOR_MONTE_CARLO_HARDENING_PLAN.md)  
**Abhaengigkeit:** Slices 04-07

## Ziel

Ein Monte-Carlo-Lauf wird durch versionierte Request-, Result- und
Exportvertraege reproduzierbar beschrieben. Der heutige reine Szenario-
Zeilenexport wird um Laufmanifest, Resultate und Diagnostik ergaenzt.

## Akzeptanzkriterien

- `MonteCarloRunRequestV1` enthaelt normalisierte Parameter, Seed,
  Sampling-/Stressmethoden, Szenarioversion und Datenfingerprint.
- `MonteCarloRunResultV1` enthaelt Outcome-Inventar, KPIs, Unsicherheit,
  Diagnostik, Warnungen, `sampleSize`/Missingness und technische Fehleranzahl.
- `MonteCarloExportV1` enthaelt Schema-, App- und gegebenenfalls Engine-Version,
  UTC-Zeit und eingebetteten Request/Result.
- Import/Leser validiert Version und Pflichtfelder fail-closed; unbekannte
  Zusatzfelder duerfen gemaess dokumentierter Forward-Policy behandelt werden.
- Dateiname ist eindeutig und sicher; keine lokalen Pfade, Secrets oder
  unbeteiligten Finanzdaten.
- Export nennt Snapshotpolicy/-version, Worker-/Chunkkonfiguration und die
  expliziten Einheiten aller Geldfelder. `null` bleibt von beobachteter 0
  unterscheidbar.
- Befristete Legacy-Read-Aliase sind als deprecated markiert und erzeugen
  Telemetrie; sie werden nicht in neue V1-Exporte geschrieben.
- Ein exportierter deterministischer Lauf kann in einem Contracttest erneut
  ausgefuehrt und gegen die vereinbarte Reproduzierbarkeit geprueft werden.

## Scope

- V1-Schemas/Validatoren,
- Erzeugung von Runmanifest und Export,
- UI-Aktion fuer den vollstaendigen MC-Export,
- Contract-, Roundtrip- und Datenschutztests.

## Nicht-Scope

- kein Cloudversand, keine Signatur und kein kryptografischer
  Herkunftsnachweis,
- kein Paired Compare,
- kein Import beliebiger historischer Altformate ohne explizite Migration.

## Geplante Dateien

- neu `app/simulator/monte-carlo-contracts.js`,
- neu oder bestehend `app/simulator/monte-carlo-export.js`,
- `app/simulator/simulator-monte-carlo.js`,
- `app/simulator/monte-carlo-ui.js`,
- optional `Simulator.html`,
- optional Versionsquelle/Buildinfo-Adapter,
- Tests/Fixtures.

Produktive Programm-/Konfigurationsdateien: **maximal 6**.

## Diff-Risiko vor Coding

- Branch vor Coding: `codex/simulator-monte-carlo-gap-plan`.
- Status vor Coding: keine versionierte Aenderung; ausschliesslich bereits
  vorgefundene unversionierte Playwright-Paketdateien unter `node_modules/`:
  - `node_modules/.bin/playwright`, `.cmd` und `.ps1`,
  - `node_modules/.bin/playwright-core`, `.cmd` und `.ps1`,
  - `node_modules/playwright/` und `node_modules/playwright-core/`.
- Abhaengigkeitscheck: Slice 07 liegt als freigegebener Release-Commit
  `5f38952` vor.
- Geplante Programmdateien:
  - neu `app/simulator/monte-carlo-contracts.js`,
  - neu `app/simulator/monte-carlo-export.js`,
  - `app/simulator/simulator-monte-carlo.js`,
  - `app/simulator/monte-carlo-ui.js`,
  - `Simulator.html`.
- Geplante Testdateien: neuer Contract-/Roundtrip-/Reproduktions-/
  Datenschutztest sowie Erweiterungen der fokussierten UI-Orchestrierung,
  soweit fuer den Download-Join erforderlich.
- Aenderungstiefe: mittel; neue oeffentliche Dateivertraege und ein neuer
  expliziter Browserdownload werden eingefuehrt, die Engine-Semantik bleibt
  unveraendert.
- Gefaehrdete Tests: Simulator-Orchestrierung, Monte-Carlo-Workerparitaet,
  Browserdownloads und CSP/Tauri-Dateipfad.
- Nicht anfassen: generierte Artefakte, Engine, bestehende Backtest-Schemas und
  die vorgefundenen unversionierten Playwright-Dateien.
- Rollback: `git checkout -- app/simulator/simulator-monte-carlo.js
  app/simulator/monte-carlo-ui.js Simulator.html`; neue Contract-/Export- und
  Testdateien nur nach Freigabe entfernen. Bei unerwartetem KPI-, Snapshot-,
  Backtest- oder FlowDelta-Delta sofort stoppen und Nachrechnung beilegen.

## Geplante Tests

- Schema-Golden-File und Roundtrip,
- fehlende/falsche Version, NaN/Infinity, unbekannte Felder,
- deterministischer Re-Run mit definierter Toleranz beziehungsweise exakter
  Paritaet fuer diskrete Felder,
- Datenschutz-/Pfadinventar,
- UI-Orchestrierung und `npm test`.

## Durchgefuehrte Aenderungen

- `MonteCarloRunRequestV1`, `MonteCarloRunResultV1` und
  `MonteCarloSnapshotPolicyV1` bilden normalisierte Eingaben, Sampling- und
  Stressparameter, Daten-/Szenariofingerprints, Outcome-Inventar, KPIs,
  Unsicherheit, Missingness, Warnungen sowie tatsaechliche Worker-/Chunk-
  Diagnostik ab.
- `MonteCarloExportV1` kapselt Request und Result mit Schema-, App-, Engine-,
  Snapshot- und Konfigurationsprovenienz. Sein kanonischer SHA-256-Fingerprint
  ist unabhaengig vom Exportzeitpunkt und wird beim Lesen gegen Manipulation
  validiert.
- Der V1-Leser validiert Versionen und Pflichtfelder fail-closed. Unbekannte
  Zusatzfelder werden erst nach erfolgreicher V1-Validierung akzeptiert,
  inventarisiert und als Forward-Compatibility-Telemetrie gemeldet.
- Nicht endliche Zahlen, zyklische Daten, `bigint`, lokale absolute Pfade und
  Schluessel fuer Secrets/Tokens werden abgewiesen. Technische Fehler werden
  ohne lokale Pfade serialisiert. Geldfelder benennen Real-/Nominaleinheit
  explizit; `null` und beobachtete 0 bleiben getrennt.
- Drei befristete Legacy-Read-Aliase sind als deprecated registriert und
  erzeugen Telemetrie. Der neue Writer schreibt ausschliesslich kanonische
  V1-Felder.
- Der Simulator erzeugt den vollstaendigen Export nach jedem abgeschlossenen
  Batch, auch bei technischen Pfadfehlern. Ein neuer, bis dahin deaktivierter
  UI-Button startet den Blob-/Object-URL-Download ausschliesslich nach
  explizitem Nutzerklick und raeumt die URL wieder auf.
- Der bisherige Export ausgewaehlter Szenariozeilen bleibt als separates
  Diagnoseartefakt unveraendert bestehen.

## Ausgefuehrte Tests

- Neuer Schema-Golden-, Roundtrip-, Reproduktions-, Datenschutz-, Versions-,
  Forward-Compatibility-, Alias-, Dateinamen- und UI-Download-Contracttest:
  104/104 Assertions gruen.
- Fokussierte Simulator-, UI-, Chunk-, Sampling-, Result-, Worker- und
  Paritaetssuiten insgesamt: 852/852 Assertions gruen.
- Syntaxpruefung der vier geaenderten beziehungsweise neuen ES-Module: gruen.
- `npm test`: 6734/6735 Assertions gruen. Einzige Abweichung ist der bereits
  vor Slice 08 dokumentierte fremde `architecture-evidence`-Fehler mit sechs
  toten Links auf zwei fehlende Forschungsdokumente. Alle uebrigen 125
  Testdateien sind gruen; keine neue Snapshot-, Backtest-, Worker- oder
  FlowDelta-Abweichung.
- `git diff --check`: gruen.

## Abweichungen vom Plan

- Kein separater Versionsadapter war erforderlich. App- und Tauri-Version
  werden im Exportmodul zentral benannt und durch einen Contracttest gegen
  `package.json` und `src-tauri/tauri.conf.json` synchron gehalten.
- `Simulator.html` wurde als bereits eingeplante optionale Produktivdatei fuer
  die explizite Downloadaktion verwendet. Insgesamt wurden fuenf produktive
  Programmdateien geaendert oder neu angelegt und damit das Limit eingehalten.

## Offene Risiken

- Datenfingerprints belegen Gleichheit, nicht externe Guete oder Herkunft. Die
  Doku darf sie nicht als empirischen Validierungsnachweis darstellen.
- App-/Tauri-Versionswerte sind Buildmetadaten im Quellmodul; der Test
  verhindert Drift im Repository, ersetzt aber keine signierte Buildprovenienz.
- Der vollstaendige Export enthaelt bewusst szenario- und finanzbezogene
  Eingaben. Lokale Pfade und Secrets werden blockiert, die JSON-Datei bleibt
  dennoch vertraulich zu behandeln.
- Exakte Replay-Paritaet ist fuer dieselbe JavaScript-Runtime vereinbart.
  Runtimeuebergreifende Floatabweichungen bleiben der dokumentierten
  Snapshotpolicy unterworfen.

## Rueckdokumentation und Freigabe

Finale Schemas, Kompatibilitaetspolitik, Provenienz-/Datenschutzgrenzen und
Testergebnisse sind in Hauptplan, GAP-Analyse, `README.md` sowie den
Simulator-/Technikreferenzen rueckdokumentiert. Implementierung abgeschlossen;
Gemini-/Nutzerreview, Freigabe und lokaler Commit stehen aus. Codex erteilt
keine eigene Freigabe und erstellt keinen Commit.

## Review-Feedback von Gemini

### 1. Systematische Prüfdimensionen
* **Korrektheit:** Slice 08 löst P0-GAP MC-11 vollständig.
  - **MC-11 (Versionierter Run- & Exportvertrag):** `MonteCarloRunRequestV1`, `MonteCarloRunResultV1` und `MonteCarloExportPayloadV1` sind vollständig spezifiziert, immutable und über das JSON-Schema `monte-carlo-export-v1-schema.json` abgesichert.
  - **Provenienz & Fingerprinting:** SHA-256 Hashes für Szenario-Parameter (`scenarioFingerprint`), Datenstand (`dataFingerprint`) und den Gesamtexport (`exportFingerprint`) garantieren fälschungssichere Provenienz.
  - **Redaktion von Pfaden & Secrets:** Lokale Systempfade (Windows/macOS/Linux) und potenzielle Secrets werden im Export-Document strikt entfernt/anonymisiert.
* **Vertragstreue:** Der Export im UI (`Simulator.html` & `monte-carlo-ui.js`) bietet einen expliziten "JSON-Export"-Button, der sauber nach jedem Lauf aktualisiert wird und den Download im Browser auslöst.
* **Fehlerbehandlung:** 104 dedizierte Contract- und Schema-Tests in `tests/monte-carlo-export-contract.test.mjs` belegen Fail-Closed-Verhalten bei Schema-Verletzungen, manipulierten Fingerprints oder fehlerhaften Eingaben (z. B. NaN, Infinity).
* **Seiteneffekte:** Punktgenau **5 produktive Programmdateien** verändert (`Simulator.html`, `monte-carlo-ui.js`, `simulator-monte-carlo.js`, `monte-carlo-contracts.js`, `monte-carlo-export.js`). Alle Dokumentationen (`README.md`, `TECHNICAL.md`, `SIMULATOR_MODULES_README.md`, Hauptplan, GAP-Analyse, Slice-Dokument) wurden konsistent aktualisiert.
* **Was könnte brechen? / Größtes Restrisiko:**
  1. Externe Auswertungsskripte müssen schema-konform `schemaVersion: "MonteCarloExportV1"` parsen. Veraltete Aliase wurden als read-only eingestuft.

### 2. Nummerierte Findings
* **Finding G-01-S8 (Lückenlose Provenienz & Pfadanonymisierung):** Der Export sichert alle Berechnungsparameter und Engine-Versionen ab, ohne sensible lokale Dateisystem-Pfade des Nutzers preiszugeben.
* **Finding G-02-S8 (Strikte Schema-Validierung):** Replays und JSON-Roundtrips bleiben zu 100% deterministisch identisch zur Originalrechnung im Browser.

### 3. Pre-Mortem (3 Monate in die Zukunft)
Wahrscheinlichste Ursache für Probleme in 3 Monaten wäre ein externes Auswertungsskript, das `MonteCarloExportV1` liest und fehlschlägt, weil es veraltete Schema-Keys (z. B. `consumptionAtRiskP10Real`) ohne Beachtung des Schema-ID-Headers sucht. Abgesichert durch die Schema-Golden-Fixtures und Telemetrie-Warnings bei Deprecation-Zugriffen.

### 4. Review-Ergebnis
- **Status:** freigegeben
- **Blocker:** keine
- **Restrisiken:**
  1. Externe Auswertungsskripte müssen schema-konform `schemaVersion: "MonteCarloExportV1"` parsen.
  2. Bekannte fremde Link-Abweichung (`architecture-evidence.test.mjs`) bleibt separiert.

## Review-Feedback von Claude

Ausstehend; Pflichtstruktur gemaess `SLICE_EXECUTION_RULES.md` verwenden.

## Review-Antworten von Codex

Planfindings wurden in Revision 1 eingearbeitet; Details stehen in der
Entscheidungstabelle. Slice 08 wurde umgesetzt und von Gemini freigegeben.

## Review-Entscheidungen

| ID | Quelle | Finding | Entscheidung | Umsetzung |
|---|---|---|---|---|
| G-01-S8 | Gemini | Lückenlose Provenienz & Anonymisierung | angenommen | SHA-256 Hashes und Pfad-Redaktion umgesetzt |
| G-02-S8 | Gemini | Strikte Schema-Validierung | angenommen | `monte-carlo-export-v1-schema.json` und Replay-Tests umgesetzt |
| C-01 | Claude | Reproduktionsmetadaten unvollstaendig | angenommen | Worker-/Chunk-/Snapshotmetadaten ergaenzt |
| C-10 | Claude | Geldwerteinheiten unklar | angenommen | explizite Real-/Nominalfeldnamen gefordert |
