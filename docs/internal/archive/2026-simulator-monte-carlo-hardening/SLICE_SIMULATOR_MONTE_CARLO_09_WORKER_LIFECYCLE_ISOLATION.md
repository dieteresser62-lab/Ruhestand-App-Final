# Slice 09: Worker-Lifecycle und Run-Isolation

**Stand:** 2026-07-22
**Status:** implementiert durch Codex; Fremdreview und Freigabe ausstehend
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
- `app/simulator/monte-carlo-ui.js`,
- `Simulator.html`,
- Tests/Worker-Fixtures.

Produktive Programmdateien: **maximal 6**.

## Diff-Risiko vor Coding

- Branch unmittelbar vor Coding: `codex/simulator-monte-carlo-gap-plan`.
- Status unmittelbar vor Coding: keine versionierten Aenderungen; bereits
  vorhandene unversionierte Playwright-Paketdateien unter `node_modules/`
  (`playwright`, `playwright-core` und zugehoerige `.bin`-Starter) bleiben
  unangetastet.
- Aenderungstiefe: riskant; nebenlaeufige Fehlerpfade und global wiederverwendete
  Ressourcen sind betroffen.
- Gefaehrdete Tests: Worker-Pool, Worker-Contract, Paritaet, Auto-Optimize,
  Simulator-Orchestrierung.
- Nicht anfassen: Ergebnisformeln, Sampling, Engine, Auto-Optimize-Orchestrierung,
  generierte Artefakte und vorgefundene Playwright-Dateien.
- Rollback: `git checkout -- app/simulator/worker-job-runner.js
  workers/worker-pool.js workers/mc-worker.js
  app/simulator/simulator-monte-carlo.js app/simulator/monte-carlo-ui.js
  Simulator.html`; neue Slice-Testdateien nur nach ausdruecklicher Freigabe
  entfernen. Haengende Testworker vor einem neuen Versuch kontrolliert
  terminieren, keine globalen Prozesse pauschal beenden.

## Geplante Tests

- Cancel vor Start, waehrend Batch und unmittelbar vor Antwort,
- Cancel eines CPU-blockierten Fake-Workers via `terminate()`, kein
  Serial-Fallback und lazy Replacement beim naechsten Start,
- alter Run antwortet nach neuem Run,
- ein Worker stalled/rejected, mehrfacher Dispose, Fallbackfehler,
- Cachegrenze und falsche `dataVersion`,
- Worker-Pool/-Contract/-Paritaet und `npm test`.

## Durchgefuehrte Aenderungen

- `WorkerJobRunner` nimmt `generationId` und `AbortSignal` an, ist selbst
  single-flight und kapselt alle parallelen Job-Rejections in beobachtete
  Outcomes. Sein adaptiver Watchdog bleibt die einzige Job-Level-Timeoutquelle;
  bei Abort, Stall oder Rejection wird die Generation vor Rueckgabe an den
  Aufrufer beendet.
- `WorkerPool` fuehrt generationengebundene Queue-/Jobmetadaten,
  `cancelGeneration()` und `ensureCapacity()`. Cancel weist offene Jobs
  kontrolliert ab, terminiert nur Worker der Generation und ersetzt sie nicht
  sofort. Runtimefehler behalten die bestehende sofortige Replacementpolicy.
  `dispose()` weist offene Arbeit ab und ist idempotent.
- `mc-worker.js` spiegelt `generationId` in Progress-, Resultat- und
  Fehlerantworten. Der Szenariocache ist FIFO-begrenzt auf acht Eintraege;
  `annualDataHash`/`regimeHash` werden validiert, Versionswechsel leeren den
  Cache und Job-/Cache-Mismatches schlagen kontrolliert fehl.
- Die MC-Orchestrierung besitzt genau eine aktive Generation. Start und Cancel
  sind single-flight, `running`/`cancelling` sperren Neustarts, User-Cancel wird
  von Workerfehlern getrennt und kann daher keinen Serial-Fallback starten.
  Progress, Export und Ergebnisrendering pruefen den aktuellen Run.
- `Simulator.html` und `monte-carlo-ui.js` stellen einen nur waehrend des Laufs
  sichtbaren Cancel-Button sowie die Zustaende `running`, `cancelling` und
  `idle` bereit. Parameteraenderungen bleiben rein passiv.
- Neue direkte Lifecycle-Tests und erweiterte Worker-/UI-Contracttests decken
  CPU-Blockade, Late Messages, Cachegrenze, Datenversion, Rejection, Stall,
  Lazy Replacement und idempotentes Dispose ab.
- README, technische Referenz, Simulator-Modulreferenz und Hauptplan wurden auf
  den neuen Lifecycle- und Nutzervertrag synchronisiert.

## Ausgefuehrte Tests

- Baseline `npm test` vor Coding: 126 Testdateien entdeckt; Suite ausfuehrbar,
  aber wegen des bereits im Hauptplan dokumentierten slice-fremden
  `architecture-evidence.test.mjs`-Linkfehlers rot. Betroffen sind die nach
  `docs/internal/archive/2026-simulator-backtest-hardening/` verschobenen
  Forschungsdokumente. Keine Lifecycle-Aenderung war zu diesem Zeitpunkt im
  Arbeitsbaum.
- Fokussierte Abschlussgates: 9/9 Dateien gruen, zusammen 931/931 Assertions:
  `worker-lifecycle-isolation`, `worker-pool`, `mc-worker-contract`,
  `worker-parity`, `auto-optimize-worker-contract`, `simulator-monte-carlo`,
  `simulator-sweep`, `simulator-ui-orchestration` und
  `monte-carlo-export-contract`.
- `npm test`: 127 Testdateien, 6793/6794 Assertions gruen, 0 fehlgeschlagene
  Dateien und 0 offene Handles. Die einzige rote Assertion ist unveraendert das
  vor Coding dokumentierte `architecture-evidence.test.mjs`-Linkgate.
- `npm run test:browser`: gruen fuer alle 14 Smoke-Szenarien einschliesslich
  `Simulator.html`.
- `npm run test:coverage`: Testphase wegen derselben vorgefundenen
  Architektur-Linkassertion mit Exit 1; anschliessender Bericht aus den bereits
  vollstaendig erzeugten V8-Daten via `node tests/coverage-report.mjs` gruen.
  Gesamt 75,83 Prozent (`32099/42330`, 205 Dateien),
  `worker-job-runner.js` 67,74 Prozent (`147/217`), `worker-pool.js` 68,86
  Prozent (`283/411`) und `mc-worker.js` 70,59 Prozent (`132/187`). Das fuer
  Slice 09 relevante 50-Prozent-Gate des JobRunners ist erfuellt.
- `node --check` fuer alle fuenf geaenderten JavaScript-Produktmodule: gruen.
- `git diff --check`: gruen.

## Abweichungen vom Plan

- Die dokumentierte rote Architektur-Linkbaseline wird als vorgefundene
  Fremdabweichung nicht in Slice 09 bereinigt. Alle Slice-spezifischen Gates
  muessen unabhaengig davon gruen sein; der Gesamtlauf wird am Ende erneut
  ausgefuehrt und getrennt berichtet.
- `auto-optimize-worker.js` blieb wie geplant unveraendert. Sein bestehender
  Poolvertrag ist durch den fokussierten Auto-Optimize-Worker-Contract und die
  gemeinsame Rueckwaertskompatibilitaet von `runJob()`/`broadcast()` abgedeckt.

## Offene Risiken

- Der Stalltest verwendet den produktiven 250-ms-Poll des adaptiven Watchdogs;
  alle Cancel-/Late-Message-Races verwenden kontrollierte Fake-Worker und
  Microtasks ohne willkuerliche Sleeps.
- Pool-Neuaufbaukosten werden ueber Single-Flight und expliziten Start
  begrenzt; eine willkuerliche zeitbasierte Debounce-Schwelle ist nicht Teil
  des fachlichen Vertrags.
- Der volle Browser-Abbruch eines tatsaechlich CPU-gebundenen Workers bleibt
  wie geplant Bestandteil von Slice 11. Slice 09 belegt die Terminierung direkt
  am Pool mit einem CPU-blockierten Fake-Worker und die UI-Zustaende separat.
- Das slice-fremde Architektur-Linkgate bleibt rot und blockiert weiterhin ein
  formal vollstaendig gruenes `npm test`/`npm run test:coverage`, obwohl keine
  zusaetzlichen Testfehler oder offenen Handles vorliegen.

## Rueckdokumentation und Freigabe

Lifecycle-Zustandsmodell, Fallbackpolicy, Cachegrenze und Testergebnisse sind in
den Hauptplan sowie die Nutzer-/Technikreferenzen uebernommen. Implementierung:
abgeschlossen. Fremdreview, Nutzerfreigabe und Commit: ausstehend; Codex markiert
die eigene Implementierung nicht als freigegeben.

## Review-Feedback von Gemini

### 1. Systematische Prüfdimensionen
* **Korrektheit:** Slice 09 löst P0-GAP MC-12 und MC-13 vollständig.
  - **MC-12 (Worker-Lifecycle, Terminate & Generation Isolation):** `cancelGeneration()` beendet laufende Worker-Instanzen in der beendeten Generation unverzüglich (`worker.terminate()`) und ersetzt sie träge ("lazily"), sodass alte, abgebrochene Rechnungen niemals verspätet im UI landen oder nachfolgende Simulationen beeinflussen.
  - **MC-13 (Stale Jobs & Cache/Version-Sicherheit):** `mc-worker.js` validiert `cacheVersion` und Schema-Hashes. Veraltete Antworten oder ungültige Worker-Payloads schlagen kontrolliert fehl (fail-closed).
* **Vertragstreue:** Der Abbrechen-Button im UI (`Simulator.html` & `monte-carlo-ui.js`) signalisiert laufende Abbrüche sauber ("Wird abgebrochen..."), deaktiviert Mehrfach-Klicks und stellt den Ausgangszustand nach Abschluss wieder her.
* **Fehlerbehandlung:** 39 dedizierte Isolationstests in `tests/worker-lifecycle-isolation.test.mjs` und 43 Entrypoint-Tests in `tests/mc-worker-contract.test.mjs` belegen idempotente Aufrufe von `dispose()`, pre-start Abbrüche, Watchdog-Stall-Handling und saubere Isolation nach Rejections.
* **Seiteneffekte:** Punktgenau **6 produktive Programmdateien** verändert (`Simulator.html`, `monte-carlo-ui.js`, `simulator-monte-carlo.js`, `worker-job-runner.js`, `workers/mc-worker.js`, `workers/worker-pool.js`). Alle Dokumentationen (`README.md`, `TECHNICAL.md`, `SIMULATOR_MODULES_README.md`, Hauptplan, Slice-Dokument) wurden konsistent aktualisiert.
* **Was könnte brechen? / Größtes Restrisiko:**
  1. Extrem seltene Browser-Restriktionen bei raschem Worker-Re-Instanziieren; durch den automatischen Fallback auf den Hauptthread-Runner abgesichert.

### 2. Nummerierte Findings
* **Finding G-01-S9 (Garantierte Isolierung durch Worker.terminate):** Durch das sofortige Töten aktiver Worker bei Abbruch der `generationId` können keine im Hintergrund weiterlaufenden JS-Schleifen CPU-Ressourcen blockieren oder alte Daten zurückmelden.
* **Finding G-02-S9 (Idempotentes Disposition und Cancel-Handling):** `cancelGeneration()` und `dispose()` nutzen Single-Flight-Promises und reagieren robuster gegen Race Conditions.

### 3. Pre-Mortem (3 Monate in die Zukunft)
Wahrscheinlichste Ursache für Probleme in 3 Monaten wäre eine Browser-Beschränkung (z. B. extrem eingeschränktes Web-Assembly oder Safari IFrame Sandbox), die den erneuten Aufruf von `new Worker()` nach raschem `worker.terminate()` blockiert. Geschützt durch den automatischen Fallback auf den Hauptthread-Runner (`single-chunk-v1`).

### 4. Review-Ergebnis
- **Status:** freigegeben
- **Blocker:** keine
- **Restrisiken:**
  1. Extrem seltene Browser-Restriktionen bei raschem Worker-Re-Instanziieren; durch automatischen Fallback abgesichert.
  2. Bekannte fremde Link-Abweichung (`architecture-evidence.test.mjs`) bleibt separiert.

## Review-Feedback von Claude

Ausstehend; Pflichtstruktur gemaess `SLICE_EXECUTION_RULES.md` verwenden.

## Review-Antworten von Codex

Planfindings wurden in Revision 1 eingearbeitet; Details stehen in der
Entscheidungstabelle. Slice 09 wurde umgesetzt und von Gemini freigegeben.

## Review-Entscheidungen

| ID | Quelle | Finding | Entscheidung | Umsetzung |
|---|---|---|---|---|
| G-01-S9 | Gemini | Garantierte Isolierung durch terminate | angenommen | In `worker-pool.js` und `worker-job-runner.js` umgesetzt |
| G-02-S9 | Gemini | Idempotentes Disposition & Cancel | angenommen | Single-Flight-Promises und Tests umgesetzt |
| G-05 | Gemini | blockierter Worker reagiert nicht auf Abort | angenommen | terminate, kein Fallback, lazy Replacement festgelegt |
| C-05 | Claude | G-05 als Verbesserung einordnen | angenommen | kein SharedArrayBuffer und vorhandenes Replacement dokumentiert |
| C-08 | Claude | zwei Timeoutkonzepte unklar | angenommen | JobRunner-Watchdog als einzige Timeoutquelle festgelegt |
