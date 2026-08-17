# Slice 02 – MC-Quellidentitaet und Pfadmaterialisierung

**Feature-Branch:** `codex/stress-pfad-replay`
**GitHub-Status:** nur lokal

## Ziel des Slice

MC-Quellidentitaet und Pfadmaterialisierung

## Akzeptanzkriterien

Siehe freigegebenen Arbeitsplan.

## Scope und Nicht-Scope

Erlaubter Scope: `app/simulator/mc-life-events.js`, `app/simulator/monte-carlo-runner.js`, `app/simulator/scenario-analyzer.js`, `app/simulator/simulator-monte-carlo.js`, `app/simulator/stress-replay-path-materializer.js`, `docs/internal/slice-stress-pfad-replay-arbeitsplan-02-mc-quellidentitaet-und-pfadmaterialisierung.md`, `docs/internal/slice-stress-replay-implement-02-mc-quellidentitaet-und-pfadmaterialisierung.md`, `docs/internal/stress-replay-implement-review-fa2904b2.md`, `tests/stress-replay-path-materializer.test.mjs`, `tests/worker-parity.test.mjs`

## Diff-Risiko inklusive Branch- und Statuscheck

- Branchcheck vor Umsetzung: `codex/stress-pfad-replay` (Soll/Ist identisch).
- Vorhandene Arbeitsbaumabweichungen waren ausschließlich die vom
  Orchestrator verwaltete Audit-MD sowie dieses bei Slice-Start angelegte
  Slice-Dokument; produktive Slice-Pfade waren sauber.
- Produktive Änderungseinheiten: fünf und damit unter der Stop-Grenze von
  mehr als zehn Programmdateien.
- Hauptrisiken: unbeabsichtigter RNG-Verbrauch im normalen MC-Pfad,
  positionsabhängige Ruinfortsetzung, uneindeutige Run-Indexbasis und eine
  zu breite Reconciliation nicht exportierter Terminalfelder.

## Geplante Tests

- Materializer-Contract für Indexbasis, Shadow-Seed-Domain, Startzustand,
  Ruinfortsetzung, Legacy-Stream-Block und fail-closed Reconciliation.
- Expliziter Tie-Break auf den kleinsten absoluten Run-Index.
- Worker-/Direktpfad-Invarianz der Finanzresultate und Logs bei opt-in
  Capture gegenüber einem normalen MC-Lauf.
- Die vollständige deterministische Validierungsmatrix bleibt beim
  Orchestrator.

## Durchgeführte Änderungen

- `ScenarioAnalyzer` transportiert pro auswählbarem Szenario absolute
  0-basierte Run-ID, 1-basierte Anzeigenummer, Auswahlmetrik und den stabilen
  Tie-Break `smallest_absolute_run_index`.
- Der bestehende serielle Nachlauf kann explizit Replay-Captures anfordern und
  reicht Abortsignal und Runner-Abhängigkeiten weiter; normale Batches und
  Worker-Chunks aktivieren den Modus nicht.
- Der MC-Runner erfasst opt-in den vollständigen Marktstartzustand, effektive
  Markt-/Stress-/Tail-Risk-Daten und Haushaltsereignisse. Ruinjahre behalten
  direkt beobachtete Marktdaten, ohne sie gegen nicht exportierte Logfelder zu
  reconciliieren.
- Nach Quellruin wird ein benannter, aus Seed, absolutem Run-Index,
  Contractversion und Domain abgeleiteter Shadow-Stream verwendet. Der normale
  MC-RNG und die bestehenden Post-Ruin-Aggregate bleiben unverändert.
- Die Post-Ruin-Fortsetzung liegt außerhalb der Quell-Jahresschleife und wird
  ausschließlich nach einem vorzeitigen Ruin ausgeführt. Ein End-to-End-
  Regressionstest deckt sowohl diesen Fall als auch den überlebenden
  Vollhorizont ab und verlangt lückenlose, duplikatfreie Jahresindizes.
- Der neue DOM-freie Materializer validiert `per-run-seed`, reconciliiert den
  Source-Prefix recordType-basiert und erzeugt erst danach einen validierten,
  fingerprinteten `StressReplayPathV1`.

## Ausgeführte Validierung mit Ergebnis

- Fokussierte Implementer-Plausibilisierung:
  `node tests/run-single.mjs tests/stress-replay-path-materializer.test.mjs`
  mit 17/17 Assertions erfolgreich.
- Fokussierte Paritätsprüfung:
  `node tests/run-single.mjs tests/worker-parity.test.mjs` nach der Korrektur
  von C-01 mit 595/595
  Assertions erfolgreich.
- `node --check` für alle fünf geänderten/neu angelegten Produktivmodule
  erfolgreich; `git diff --check` ohne Befund.
- Keine vollständige Validierungsmatrix ausgeführt; deren Attestierung wird
  ausschließlich vom Orchestrator projiziert.

## Abweichungen vom Plan

Keine.

## Offene Risiken

- Externes Slice-Review und Orchestrator-Validierungsattest stehen aus.
- Die fachliche Nutzung der materialisierten Ruinjahresdaten durch den
  deterministischen Runner ist Gegenstand des nachfolgenden Slice 03.
- Siehe Findings-Lebenszyklus für neue Reviewer-Findings.

## Review-Feedback von Claude

<!-- audit:claude-review:begin -->
### Ereignis 2: Runde 1

- Reviewer: `claude`
- Freigabe: `NO`
- Validierungsbindung: `validation-2881e5e1b3b9`
- Testdateien: `tests/stress-replay-path-materializer.test.mjs`, `tests/worker-parity.test.mjs`
- Eigene Findings: `C-01`

### Ereignis 4: Runde 2

- Reviewer: `claude`
- Freigabe: `NO`
- Validierungsbindung: `validation-ce7c3b1aa3ee`
- Testdateien: `tests/stress-replay-path-materializer.test.mjs`, `tests/worker-parity.test.mjs`
- Eigene Findings: `C-01`

### Ereignis 6: Runde 3

- Reviewer: `claude`
- Freigabe: `YES`
- Validierungsbindung: `validation-aa70f1395102`
- Testdateien: `tests/stress-replay-path-materializer.test.mjs`, `tests/worker-parity.test.mjs`
- Prüfdimensionen: correctness/control-flow placement of the post-ruin shadow block, capture-request schema/RNG-mode fail-closed guards, cancellation (&#96;signal&#96;) checks at run/year/shadow-year granularity, opt-in isolation from normal MC batches, materializer reconciliation fail-closed on record-type/prefix mismatch and rejection of &#96;legacy-stream&#96; captures, scenario-analyzer tie-break determinism (smallest absolute run index) with a dedicated regression test
- Größtes Restrisiko: largest residual risk: C-02 (possible one-year-stale market history feeding the first shadow-year CAPE resolution)
- Realistische Bruchbedingung: break condition: a real ruin scenario where the ruin year's actual regime/return materially differs from the prior year's, causing the first shadow-continuation year's CAPE/regime to silently diverge from the true post-ruin market state, only surfacing later as an unexplained discrepancy in Slice 3's deterministic single-path runner output.
- Eigene Findings: `C-01`, `C-02`
<!-- audit:claude-review:end -->

## Review-Feedback von Antigravity

<!-- audit:antigravity-review:begin -->
### Ereignis 7: Runde 1

- Reviewer: `antigravity`
- Freigabe: `YES`
- Validierungsbindung: `validation-aa70f1395102`
- Testdateien: `tests/stress-replay-path-materializer.test.mjs`, `tests/worker-parity.test.mjs`
- Prüfdimensionen: Post-Ruin-Fortsetzungsplatzierung, Fail-Closed-Reconciliation bei Log-Diskrepanzen, Seed-Ableitung via SHA-256-Fingerprint, kleinster-Index-Tie-Break im ScenarioAnalyzer, Opt-in-Isolation des MC-Runners und Signal-Cancellation
- Größtes Restrisiko: Verbleibendes Risiko C-02 bezüglich nicht aktualisiertem marketDataHist im Ruinjahr vor Start des Shadow-Loops
- Realistische Bruchbedingung: Bruchbedingung: Ein vorzeitiger Ruin mit signifikantem Rendite-/CAPE-Sprung im Ruinjahr führt dazu, dass das erste Fortsetzungsjahr die CAPE-Ratio auf Basis des Vor-Ruinjahres berechnet und downstream in Slice 03/04 eine abweichende Regime-Klassifikation ermittelt wird.
- Eigene Findings: keine
<!-- audit:antigravity-review:end -->

## Review-Antworten von Codex

<!-- audit:codex-responses:begin -->
- `C-01` Antwort 1: **angenommen** — Post-Ruin-Fortsetzung läuft ausschließlich nach vorzeitigem Ruin außerhalb der Jahresschleife. Regressionstests bestätigen für Ruin und Überleben vollständige, streng steigende und duplikatfreie Jahresfolgen; fokussierter Testlauf 595/595 erfolgreich.
- `C-01` Antwort 2: **angenommen** — Shadow-Fortsetzung läuft nur nach echtem vorzeitigem Ruin mit BREAK_ON_RUIN und ohne technischen Fehler; Überlebenspfade aktivieren sie nicht.
<!-- audit:codex-responses:end -->

## Validierungsattestierung

<!-- audit:validation-attestation:begin -->
### Ereignis 1: `validation-2881e5e1b3b9`

- Diff-Fingerprint: `2881e5e1b3b977ee8b86e6d58aaf93efb8dcd02be7e588130ee0f9ff725af8ea`
- Status: `PASS`
- Vollständig: `YES`
- Kurzresultat: 1 passed; 0 failed; 0 unavailable; 1 required
- Ausgabedigest: `f485089d22dc0e19cecdb04e6282df52e3016fe31714bcec8984943da68d812c`

| Matrixbefehl | Status | Exitcode | Kompaktausgabe |
|---|---|---:|---|
| shell: npm test | PASS | 0 | &gt; ruhestand-app-final@1.0.0 test<br>&gt; node tests/run-tests.mjs<br><br>🚀 Starting Test Runner...<br>Found 171 test files.<br><br>📂 Running 3bucket-config.test.mjs in process...<br>--- 3-Bucket Config Tests ---<br>✅ 3-Bucket config tests passed<br>✅ 3bucket-config.test.mjs completed.<br>📊 FILE RESULT: 3bucket-config.test.mjs &#124; mode=in-process &#124; assertions=17 &#124; passed=17 &#124; failedAssertions=0 &#124; failedFiles=0<br><br>📂 Running 3bucket-refill.test.mjs in process...<br>--- 3-Bucket Refill Tests ---<br>✅ 3-Bucket refill tests passed<br>✅ 3bucket-refill.test.mjs completed.<br>📊 FILE RESULT: 3bucket-refill.test.mjs &#124; mode=in-process &#124; assertions=32 &#124; passed=32 &#124; failedAssertions=0 &#124; failedFiles=0<br><br>📂 Running architecture-evidence.test.mjs in process...<br>--- Architecture Evidence Contract Tests ---<br>✅ Architecture evidence contract tests passed<br>✅ architecture-evidence.test.mjs completed.<br>📊 FILE RESULT: architecture-evidence.test.mjs &#124; mode=in-process &#124; assertions=24 &#124; passed=24 &#124; failedAssertions=0 &#124; failedFiles=0<br><br>📂 Running auto-optimize-fidelity<br>...[175818 characters omitted]...<br>ete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/app/profile/profile-storage.js:537:28)<br>    at initProfileSubpageLifecycle (file:///mnt/c/Users/Diete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/app/profile/profile-navigation.js:157:5)<br>    at initProfileBridge (file:///mnt/c/Users/Diete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/app/profile/profile-bridge.js:8:5)<br>    at async Promise.all (index 0)<br>    at async MockDocument.dispatch (file:///mnt/c/Users/Diete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/tests/profile-ui-contract.test.mjs:80:9)<br>    at async runProfileUiContractTests (file:///mnt/c/Users/Diete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/tests/profile-ui-contract.test.mjs:244:9)<br>    at async file:///mnt/c/Users/Diete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/tests/profile-ui-contract.test.mjs:257:9<br>[VALIDATION ERROR] Invalid input fields: [<br>  {<br>    fieldId: 'goGoMultiplier',<br>    message: 'goGoMultiplier muss zwischen 1.0 und 1.5 liegen.'<br>  }<br>] |

### Ereignis 3: `validation-ce7c3b1aa3ee`

- Diff-Fingerprint: `ce7c3b1aa3eeec121f918ab68ba0268e3f563986cc487fe272f97d40b72488d3`
- Status: `PASS`
- Vollständig: `YES`
- Kurzresultat: 1 passed; 0 failed; 0 unavailable; 1 required
- Ausgabedigest: `f80a585741e9590d8958c3a4e3acf1bf7d6568bf10c5bdb1f6cd49b632d794b8`

| Matrixbefehl | Status | Exitcode | Kompaktausgabe |
|---|---|---:|---|
| shell: npm test | PASS | 0 | &gt; ruhestand-app-final@1.0.0 test<br>&gt; node tests/run-tests.mjs<br><br>🚀 Starting Test Runner...<br>Found 171 test files.<br><br>📂 Running 3bucket-config.test.mjs in process...<br>--- 3-Bucket Config Tests ---<br>✅ 3-Bucket config tests passed<br>✅ 3bucket-config.test.mjs completed.<br>📊 FILE RESULT: 3bucket-config.test.mjs &#124; mode=in-process &#124; assertions=17 &#124; passed=17 &#124; failedAssertions=0 &#124; failedFiles=0<br><br>📂 Running 3bucket-refill.test.mjs in process...<br>--- 3-Bucket Refill Tests ---<br>✅ 3-Bucket refill tests passed<br>✅ 3bucket-refill.test.mjs completed.<br>📊 FILE RESULT: 3bucket-refill.test.mjs &#124; mode=in-process &#124; assertions=32 &#124; passed=32 &#124; failedAssertions=0 &#124; failedFiles=0<br><br>📂 Running architecture-evidence.test.mjs in process...<br>--- Architecture Evidence Contract Tests ---<br>✅ Architecture evidence contract tests passed<br>✅ architecture-evidence.test.mjs completed.<br>📊 FILE RESULT: architecture-evidence.test.mjs &#124; mode=in-process &#124; assertions=24 &#124; passed=24 &#124; failedAssertions=0 &#124; failedFiles=0<br><br>📂 Running auto-optimize-fidelity<br>...[175818 characters omitted]...<br>ete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/app/profile/profile-storage.js:537:28)<br>    at initProfileSubpageLifecycle (file:///mnt/c/Users/Diete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/app/profile/profile-navigation.js:157:5)<br>    at initProfileBridge (file:///mnt/c/Users/Diete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/app/profile/profile-bridge.js:8:5)<br>    at async Promise.all (index 0)<br>    at async MockDocument.dispatch (file:///mnt/c/Users/Diete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/tests/profile-ui-contract.test.mjs:80:9)<br>    at async runProfileUiContractTests (file:///mnt/c/Users/Diete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/tests/profile-ui-contract.test.mjs:244:9)<br>    at async file:///mnt/c/Users/Diete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/tests/profile-ui-contract.test.mjs:257:9<br>[VALIDATION ERROR] Invalid input fields: [<br>  {<br>    fieldId: 'goGoMultiplier',<br>    message: 'goGoMultiplier muss zwischen 1.0 und 1.5 liegen.'<br>  }<br>] |

### Ereignis 5: `validation-aa70f1395102`

- Diff-Fingerprint: `aa70f1395102ff4050778f1ce015da6cd453c02a33465d7bdffac3aab4b7b9a2`
- Status: `PASS`
- Vollständig: `YES`
- Kurzresultat: 1 passed; 0 failed; 0 unavailable; 1 required
- Ausgabedigest: `f3a02c3dc6d8e96dcdebe35d943a6ca6fb68587861978a2f4801e4772393a313`

| Matrixbefehl | Status | Exitcode | Kompaktausgabe |
|---|---|---:|---|
| shell: npm test | PASS | 0 | &gt; ruhestand-app-final@1.0.0 test<br>&gt; node tests/run-tests.mjs<br><br>🚀 Starting Test Runner...<br>Found 171 test files.<br><br>📂 Running 3bucket-config.test.mjs in process...<br>--- 3-Bucket Config Tests ---<br>✅ 3-Bucket config tests passed<br>✅ 3bucket-config.test.mjs completed.<br>📊 FILE RESULT: 3bucket-config.test.mjs &#124; mode=in-process &#124; assertions=17 &#124; passed=17 &#124; failedAssertions=0 &#124; failedFiles=0<br><br>📂 Running 3bucket-refill.test.mjs in process...<br>--- 3-Bucket Refill Tests ---<br>✅ 3-Bucket refill tests passed<br>✅ 3bucket-refill.test.mjs completed.<br>📊 FILE RESULT: 3bucket-refill.test.mjs &#124; mode=in-process &#124; assertions=32 &#124; passed=32 &#124; failedAssertions=0 &#124; failedFiles=0<br><br>📂 Running architecture-evidence.test.mjs in process...<br>--- Architecture Evidence Contract Tests ---<br>✅ Architecture evidence contract tests passed<br>✅ architecture-evidence.test.mjs completed.<br>📊 FILE RESULT: architecture-evidence.test.mjs &#124; mode=in-process &#124; assertions=24 &#124; passed=24 &#124; failedAssertions=0 &#124; failedFiles=0<br><br>📂 Running auto-optimize-fidelity<br>...[176004 characters omitted]...<br>ete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/app/profile/profile-storage.js:537:28)<br>    at initProfileSubpageLifecycle (file:///mnt/c/Users/Diete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/app/profile/profile-navigation.js:157:5)<br>    at initProfileBridge (file:///mnt/c/Users/Diete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/app/profile/profile-bridge.js:8:5)<br>    at async Promise.all (index 0)<br>    at async MockDocument.dispatch (file:///mnt/c/Users/Diete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/tests/profile-ui-contract.test.mjs:80:9)<br>    at async runProfileUiContractTests (file:///mnt/c/Users/Diete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/tests/profile-ui-contract.test.mjs:244:9)<br>    at async file:///mnt/c/Users/Diete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/tests/profile-ui-contract.test.mjs:257:9<br>[VALIDATION ERROR] Invalid input fields: [<br>  {<br>    fieldId: 'goGoMultiplier',<br>    message: 'goGoMultiplier muss zwischen 1.0 und 1.5 liegen.'<br>  }<br>] |
<!-- audit:validation-attestation:end -->

## Testfreigabe und Pre-Mortem

<!-- audit:test-approval-premortem:begin -->
- Teständerungsfreigabe: nicht erfasst.
- Pre-Mortems:
  - Ereignis 2: In three months, the most likely failure is a real user hitting a ruined path in the stress-replay UI (Slice 8/9) where the post-ruin continuation is silently missing or empty despite the UI advertising a "post-ruin shadow" view, or — worse — a survived-run replay export that silently contains duplicated/overlapping year rows that desynchronize the exported table from the underlying source log, surfacing as a confusing off-by-N-years mismatch or a &#96;STRESS_REPLAY_RECONCILIATION_FAILED&#96; that only a later slice (persistence/export in Slice 7, or the runner consumer in Slice 3) discovers when it actually tries to use &#96;stressReplayCapture&#96; end-to-end for the first time, well after this slice was marked approved.
  - Ereignis 6: In three months, the most likely failure is that Slice 3's deterministic single-path runner (or the persistence/export layer in Slice 7) consumes &#96;stressReplayCapture.years&#96; assuming every year's &#96;capeRatio&#96;/&#96;regime&#96; was computed off a fully up-to-date &#96;marketDataHist&#96;, and a ruin-adjacent shadow-continuation year silently carries a stale CAPE snapshot (C-02) that only becomes visible as an unexplained regime/CAPE mismatch deep in a downstream slice, well after this slice is marked approved and harder to trace back to this exact hand-off point.
  - Ereignis 7: In drei Monaten könnte ein Folge-Slice beim Verzehr von &#96;stressReplayCapture.years&#96; im Single-Path-Runner (Slice 03) oder beim Variantenvergleich (Slice 06) darauf vertrauen, dass alle Marktdaten der Historie nahtlos fortgeschrieben wurden, und an der Nahtstelle zwischen Ruinjahr und erstem Fortsetzungsjahr eine unbemerkte Ein-Jahres-Verzögerung der CAPE-Ratio zu subtilen Regime-Diskrepanzen führen.
<!-- audit:test-approval-premortem:end -->

## Findings-Lebenszyklus

<!-- audit:findings:begin -->
### `C-01` — `CLOSED`

- Quelle: `claude`; Runde 1
- Klasse: `BLOCKER`
- Finding: The post-ruin shadow-continuation block in &#96;runMonteCarloChunk&#96; (monte-carlo-runner.js) is placed at the end of every iteration of the per-year loop body rather than gated to fire exactly once when the loop terminates early due to ruin, so it is either unreachable when &#96;BREAK_ON_RUIN&#96; is true (ruin case — the shadow continuation never runs, contradicting the slice's stated purpose) or fires spuriously on ordinary surviving years (corrupting &#96;replayCapture.years&#96;/&#96;sourcePrefixLength&#96; with duplicated yearIndex entries and mutating the shared &#96;simState.marketDataHist&#96; mid-run).
- Akzeptanztest: Add an end-to-end test (extending &#96;tests/worker-parity.test.mjs&#96; or a new &#96;tests/stress-replay-runner-capture.test.mjs&#96;, run through the orchestrator's next validation matrix) that (a) drives &#96;runMonteCarloChunk&#96; with &#96;stressReplayCapture&#96; on parameters engineered to force a genuine mid-horizon ruin and asserts &#96;runMeta[0].stressReplayCapture.continuation.active === true&#96;, &#96;years.length === horizonYears&#96;, and that &#96;years.map(y =&gt; y.yearIndex)&#96; is strictly increasing with no duplicates; and (b) drives it on a scenario that survives the full horizon and asserts &#96;stressReplayCapture.continuation.active === false&#96; and &#96;years.length === horizonYears&#96; with no duplicate &#96;yearIndex&#96; entries. VALIDATE: ["node", "tests/run-single.mjs", "tests/worker-parity.test.mjs"]
- Statusbegründung: Traced the corrected control flow precisely by indentation/brace matching in the diff: the closing &#96;}&#96; after the &#96;else { technicalPathError = …; break; }&#96; branch (8-space indent) closes the per-year &#96;for (let simulationsJahr…)&#96; loop itself — it is a sibling of that loop's own declaration, not nested inside it. The new &#96;endedEarlyBecauseOfRuin&#96;/&#96;shouldCapturePostRuinContinuation&#96;/&#96;if (shouldCapturePostRuinContinuation) { … }&#96; block sits at that same 8-space (post-loop, per-run) level, i.e. strictly after the year loop exits, executed at most once per run &#96;i&#96;. &#96;shouldCapturePostRuinContinuation&#96; requires &#96;endedEarlyBecauseOfRuin = failed &amp;&amp; BREAK_ON_RUIN &amp;&amp; !technicalPathError&#96;, which is only true when the engine actually returned a ruin result and the loop broke; on ordinary surviving years &#96;failed&#96; stays false so the block never executes, and on genuine ruin it now executes exactly once. This is the opposite of the round-2 closure's claim ("trailing statement inside the per-year for-loop body") — that claim does not match this delta. The shadow loop starts at &#96;shadowYearIndex = replayCapture.years.length&#96; (the year immediately after the already-pushed &#96;terminal_ruin&#96; record), so no duplicate &#96;yearIndex&#96; is produced, and it always runs to &#96;maxDauer&#96;, filling the continuation with &#96;continuation:true&#96; records. The two new &#96;worker-parity.test.mjs&#96; cases directly encode the finding's acceptance criteria: ruin fixture asserts &#96;terminalStatus===RUIN&#96;, &#96;continuation.active===true&#96;, &#96;years.length===horizonYears&#96;, strictly increasing/duplicate-free &#96;yearIndex&#96;; survival fixture asserts &#96;terminalStatus===HORIZON_EXHAUSTED&#96;, &#96;continuation.active===false&#96;, full-horizon coverage, and &#96;normal.runMeta[0]&#96; has no &#96;stressReplayCapture&#96; key at all (opt-in isolation, matches "Capture must not change terminal wealth/path summaries/log rows" assertions). Bound attestation &#96;validation-aa70f1395102&#96; (npm test, full suite) is PASS for this exact fingerprint. Given the structural placement, the gating condition, and matching regression coverage validated at the bound fingerprint, the original defect (unreachable-on-ruin / spurious-on-survival) is fixed. Reopen only if a future diff moves this block back inside the per-year loop or weakens &#96;endedEarlyBecauseOfRuin&#96;.

### `C-02` — `OPEN`

- Quelle: `claude`; Runde 3
- Klasse: `OBSERVATION`
- Finding: The shadow continuation's first iteration computes &#96;resolvedCapeRatio&#96; from &#96;simState.marketDataHist&#96; as it stood when the year loop exited. This diff does not show (and the surrounding unchanged code is not in the packet) whether &#96;simState.marketDataHist&#96; is updated with the ruin year's own effective return/CAPE data before the &#96;terminal_ruin&#96; branch breaks, or whether it still reflects only the last successfully completed prior year. If the ruin year's own market data is never folded in before the shadow loop starts, the first post-ruin shadow year's CAPE resolution (and therefore tail-risk/regime classification) would be computed against a one-year-stale history, silently skewing the shadow continuation's first observed year relative to what actually happened in the source path.
- Akzeptanztest: acceptance=Add a focused trace assertion (extend &#96;tests/worker-parity.test.mjs&#96;'s existing ruin fixture) that captures &#96;simState.marketDataHist&#96; (e.g. via a temporary export/inspection hook or by comparing &#96;replayCapture.years[sourcePrefixLength-1].equityReturnPct&#96;/&#96;capeRatio&#96; against the &#96;initialMarketDataHist&#96; snapshot taken at the start of the shadow block) and asserts the ruin year's own effective return is reflected in the market history used for the first shadow-year CAPE computation; if it is not currently reflected, call &#96;buildNextMarketDataHist&#96; with the ruin year's &#96;yearData&#96; immediately before entering the shadow loop. VALIDATE: ["node", "tests/run-single.mjs", "tests/worker-parity.test.mjs"]
- Statusbegründung: –
<!-- audit:findings:end -->

## Entscheidungstabelle

<!-- audit:decision-table:begin -->
| ID | Quelle | Finding | Klasse | Entscheidung | Umsetzung |
|---|---|---|---|---|---|
| C-01 | claude | The post-ruin shadow-continuation block in &#96;runMonteCarloChunk&#96; (monte-carlo-runner.js) is placed at the end of every iteration of the per-year loop body rather than gated to fire exactly once when the loop terminates early due to ruin, so it is either unreachable when &#96;BREAK_ON_RUIN&#96; is true (ruin case — the shadow continuation never runs, contradicting the slice's stated purpose) or fires spuriously on ordinary surviving years (corrupting &#96;replayCapture.years&#96;/&#96;sourcePrefixLength&#96; with duplicated yearIndex entries and mutating the shared &#96;simState.marketDataHist&#96; mid-run). | BLOCKER | angenommen | erledigt: Traced the corrected control flow precisely by indentation/brace matching in the diff: the closing &#96;}&#96; after the &#96;else { technicalPathError = …; break; }&#96; branch (8-space indent) closes the per-year &#96;for (let simulationsJahr…)&#96; loop itself — it is a sibling of that loop's own declaration, not nested inside it. The new &#96;endedEarlyBecauseOfRuin&#96;/&#96;shouldCapturePostRuinContinuation&#96;/&#96;if (shouldCapturePostRuinContinuation) { … }&#96; block sits at that same 8-space (post-loop, per-run) level, i.e. strictly after the year loop exits, executed at most once per run &#96;i&#96;. &#96;shouldCapturePostRuinContinuation&#96; requires &#96;endedEarlyBecauseOfRuin = failed &amp;&amp; BREAK_ON_RUIN &amp;&amp; !technicalPathError&#96;, which is only true when the engine actually returned a ruin result and the loop broke; on ordinary surviving years &#96;failed&#96; stays false so the block never executes, and on genuine ruin it now executes exactly once. This is the opposite of the round-2 closure's claim ("trailing statement inside the per-year for-loop body") — that claim does not match this delta. The shadow loop starts at &#96;shadowYearIndex = replayCapture.years.length&#96; (the year immediately after the already-pushed &#96;terminal_ruin&#96; record), so no duplicate &#96;yearIndex&#96; is produced, and it always runs to &#96;maxDauer&#96;, filling the continuation with &#96;continuation:true&#96; records. The two new &#96;worker-parity.test.mjs&#96; cases directly encode the finding's acceptance criteria: ruin fixture asserts &#96;terminalStatus===RUIN&#96;, &#96;continuation.active===true&#96;, &#96;years.length===horizonYears&#96;, strictly increasing/duplicate-free &#96;yearIndex&#96;; survival fixture asserts &#96;terminalStatus===HORIZON_EXHAUSTED&#96;, &#96;continuation.active===false&#96;, full-horizon coverage, and &#96;normal.runMeta[0]&#96; has no &#96;stressReplayCapture&#96; key at all (opt-in isolation, matches "Capture must not change terminal wealth/path summaries/log rows" assertions). Bound attestation &#96;validation-aa70f1395102&#96; (npm test, full suite) is PASS for this exact fingerprint. Given the structural placement, the gating condition, and matching regression coverage validated at the bound fingerprint, the original defect (unreachable-on-ruin / spurious-on-survival) is fixed. Reopen only if a future diff moves this block back inside the per-year loop or weakens &#96;endedEarlyBecauseOfRuin&#96;. |
| C-02 | claude | The shadow continuation's first iteration computes &#96;resolvedCapeRatio&#96; from &#96;simState.marketDataHist&#96; as it stood when the year loop exited. This diff does not show (and the surrounding unchanged code is not in the packet) whether &#96;simState.marketDataHist&#96; is updated with the ruin year's own effective return/CAPE data before the &#96;terminal_ruin&#96; branch breaks, or whether it still reflects only the last successfully completed prior year. If the ruin year's own market data is never folded in before the shadow loop starts, the first post-ruin shadow year's CAPE resolution (and therefore tail-risk/regime classification) would be computed against a one-year-stale history, silently skewing the shadow continuation's first observed year relative to what actually happened in the source path. | OBSERVATION | offen | offen |
<!-- audit:decision-table:end -->

## Rückdokumentation in die Arbeitsplan-MD

Arbeitsplan: `docs/internal/stress-replay-implement-review-fa2904b2.md`

## Freigabestatus

<!-- audit:approval-status:begin -->
- Implementierung bereit: `YES`
- Validierung: `PASS`
- Claude-Freigabe: `YES`
- Antigravity-Freigabe: `YES`
- Red-State-Folgeslice: `NONE`
- Commit autorisiert: `YES`
<!-- audit:approval-status:end -->
