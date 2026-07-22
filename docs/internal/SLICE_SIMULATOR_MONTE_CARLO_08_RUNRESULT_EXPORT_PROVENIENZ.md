# Slice 08: RunResult, Export und Provenienz

**Stand:** 2026-07-19  
**Status:** Revision 1 nach Review; erneute Freigabe ausstehend  
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

- Branch und Status unmittelbar vor Coding hier nachtragen.
- Aenderungstiefe: mittel; neue oeffentliche Dateivertraege werden eingefuehrt.
- Gefaehrdete Tests: Simulator-Orchestrierung, Persistenz, Browserdownloads,
  CSP/Tauri-Dateipfad.
- Nicht anfassen: generierte Artefakte, Engine, bestehende Backtest-Schemas.
- Rollback: neue Contract-/Exportmodule und ausschliesslich gelistete Consumer
  auf den letzten freigegebenen Commit; Exportschema nach Freigabe nicht
  unversioniert ueberschreiben.

## Geplante Tests

- Schema-Golden-File und Roundtrip,
- fehlende/falsche Version, NaN/Infinity, unbekannte Felder,
- deterministischer Re-Run mit definierter Toleranz beziehungsweise exakter
  Paritaet fuer diskrete Felder,
- Datenschutz-/Pfadinventar,
- UI-Orchestrierung und `npm test`.

## Durchgefuehrte Aenderungen

Noch keine Implementierung.

## Ausgefuehrte Tests

Noch keine Slice-spezifischen Tests ausgefuehrt.

## Abweichungen vom Plan

- Keine Abweichung.

## Offene Risiken

- Datenfingerprints belegen Gleichheit, nicht externe Guete oder Herkunft. Die
  Doku darf sie nicht als empirischen Validierungsnachweis darstellen.

## Rueckdokumentation und Freigabe

Finale Schemas, Kompatibilitaetspolitik, Beispielmanifest und Tests in den
Hauptplan uebernehmen. Implementierung und Freigaben: ausstehend.

## Review-Feedback von Gemini

Ausstehend; Pflichtstruktur gemaess `SLICE_EXECUTION_RULES.md` verwenden.

## Review-Feedback von Claude

Ausstehend; Pflichtstruktur gemaess `SLICE_EXECUTION_RULES.md` verwenden.

## Review-Antworten von Codex

Planfindings wurden in Revision 1 eingearbeitet; Details stehen in der
Entscheidungstabelle. Slice-spezifische Re-Review ist ausstehend.

## Review-Entscheidungen

| ID | Quelle | Finding | Entscheidung | Umsetzung |
|---|---|---|---|---|
| C-01 | Claude | Reproduktionsmetadaten unvollstaendig | angenommen | Worker-/Chunk-/Snapshotmetadaten ergaenzt |
| C-10 | Claude | Geldwerteinheiten unklar | angenommen | explizite Real-/Nominalfeldnamen gefordert |
