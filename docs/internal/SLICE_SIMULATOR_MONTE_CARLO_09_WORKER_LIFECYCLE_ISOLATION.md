# Slice 09: Worker-Lifecycle und Run-Isolation

**Stand:** 2026-07-19  
**Status:** Revision 1 nach Review; erneute Freigabe ausstehend  
**Feature-Branch:** `codex/simulator-monte-carlo-gap-plan`  
**GitHub-Status:** nur lokal; Veroeffentlichung ausstehend  
**Arbeitsplan:** [SIMULATOR_MONTE_CARLO_HARDENING_PLAN.md](./SIMULATOR_MONTE_CARLO_HARDENING_PLAN.md)  
**Abhaengigkeit:** Slice 02

## Ziel

Jeder Monte-Carlo-Lauf besitzt eine eindeutige Generation und einen
abbrechbaren Lifecycle. Stalls, Rejections, Fallbacks und spaete
Workerantworten duerfen weder den aktuellen Run noch Cache oder UI
nachtraeglich veraendern.

## Akzeptanzkriterien

- `WorkerJobRunner` akzeptiert einen Run-/Generation-Identifier und ein
  Abbruchsignal oder einen gleichwertigen expliziten Cancelcontract.
- Abbruch beendet beziehungsweise verwirft alle zugehoerigen offenen Jobs;
  spaete Antworten werden deterministisch ignoriert.
- Da CPU-gebundene Worker keine zeitnahe `postMessage(abort)`-Bearbeitung
  garantieren, terminiert User-Cancel alle fuer die aktive Generation
  arbeitenden Worker. Es gibt keinen `SharedArrayBuffer`; gemeinsam mutierter
  Speicher muss daher nicht reconciliiert werden.
- User-Cancel startet keinen seriellen Fallback. Der Singleton-Pool bleibt bei
  gesunden Workern erhalten; terminierte Slots werden erst beim naechsten
  expliziten Start lazy ersetzt. Start ist waehrend `cancelling` deaktiviert.
- Parameteraenderungen starten keinen MC-Lauf automatisch. Doppelte Start- und
  Cancelaktionen sind single-flight, sodass schnelle UI-Interaktionen keine
  Terminate-/Recreate-Schleife erzeugen.
- Worker-Stall/Rejection loest genau einen dokumentierten Fallback oder Fehler
  aus und laesst keine unobserved Rejections zurueck.
- Beim neuen Lauf wird der alte Lauf isoliert; UI-Fortschritt kann nicht
  rueckwaerts oder auf ein altes Ergebnis springen.
- Szenariocache ist begrenzt oder laufbezogen und prueft `dataVersion` statt sie
  nur zu spiegeln.
- Dispose/Neuinitialisierung ist idempotent und durch Tests belegt.
- `WorkerJobRunner` wird erweitert, nicht ersetzt. Sein adaptiver
  Stall-Watchdog ist die einzige Job-Level-Timeoutquelle; der Pool stellt
  Terminierung/Replacement bereit, fuehrt aber keinen zweiten konkurrierenden
  Timeout ein.

## Scope

- WorkerJobRunner, Pool-/Workerprotokoll und MC-Orchestrierung,
- Generation, Abort, Fallback und Cache-/Datenversionspolicy,
- Lifecycle- und Race-Tests.

## Nicht-Scope

- keine KPI-, Sampling- oder Engine-Semantik,
- keine neue allgemeine Workerplattform fuer andere Features,
- keine UI-Gestaltung ausser minimaler Abbruchverdrahtung fuer Tests.

## Geplante Dateien

- `app/simulator/worker-job-runner.js`,
- `workers/worker-pool.js`,
- `workers/mc-worker.js`,
- `app/simulator/simulator-monte-carlo.js`,
- optional `app/simulator/auto-optimize-worker.js`,
- optional `app/simulator/monte-carlo-ui.js`,
- Tests/Worker-Fixtures.

Produktive Programmdateien: **maximal 6**.

## Diff-Risiko vor Coding

- Branch und Status unmittelbar vor Coding hier nachtragen.
- Aenderungstiefe: riskant; nebenlaeufige Fehlerpfade und global wiederverwendete
  Ressourcen sind betroffen.
- Gefaehrdete Tests: Worker-Pool, Worker-Contract, Paritaet, Auto-Optimize,
  Simulator-Orchestrierung.
- Nicht anfassen: Ergebnisformeln, Sampling, Engine, generierte Artefakte.
- Rollback: nur gelistete Dateien auf den Slice-02-Commit; haengende Testworker
  vor einem neuen Versuch kontrolliert terminieren, keine globalen Prozesse
  pauschal beenden.

## Geplante Tests

- Cancel vor Start, waehrend Batch und unmittelbar vor Antwort,
- Cancel eines CPU-blockierten Fake-Workers via `terminate()`, kein
  Serial-Fallback und lazy Replacement beim naechsten Start,
- alter Run antwortet nach neuem Run,
- ein Worker stalled/rejected, mehrfacher Dispose, Fallbackfehler,
- Cachegrenze und falsche `dataVersion`,
- Worker-Pool/-Contract/-Paritaet und `npm test`.

## Durchgefuehrte Aenderungen

Noch keine Implementierung.

## Ausgefuehrte Tests

Noch keine Slice-spezifischen Tests ausgefuehrt.

## Abweichungen vom Plan

- Keine Abweichung.

## Offene Risiken

- Zeitbasierte Race-Tests koennen flakey werden. Bevorzugt kontrollierbare
  Fake-Worker/Deferred Promises statt reale Sleeps verwenden.
- Pool-Neuaufbaukosten werden ueber Single-Flight und expliziten Start
  begrenzt; eine willkuerliche zeitbasierte Debounce-Schwelle ist nicht Teil
  des fachlichen Vertrags.

## Rueckdokumentation und Freigabe

Lifecycle-Zustandsmodell, Fallbackpolicy, Cachegrenze und Testergebnisse in den
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
| G-05 | Gemini | blockierter Worker reagiert nicht auf Abort | angenommen | terminate, kein Fallback, lazy Replacement festgelegt |
| C-05 | Claude | G-05 als Verbesserung einordnen | angenommen | kein SharedArrayBuffer und vorhandenes Replacement dokumentiert |
| C-08 | Claude | zwei Timeoutkonzepte unklar | angenommen | JobRunner-Watchdog als einzige Timeoutquelle festgelegt |
