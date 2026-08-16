# Overall audit – Stress_Replay_Korrekturen-implement

Dieses Dokument wird vom Orchestrator geführt. Slice-Dokumente entstehen erst beim tatsächlichen Beginn ihrer Implementierung.

- Task-Datei: `inbox/Stress_Replay_Korrekturen-implement.md`
- Run-ID: `watch-20260815-190227.247051Z-c7c39e82d711`
- Zielbranch: `codex/stress-pfad-replay`
- Deklarierter Produktscope: `README.md`, `app/shared/persistence-facade.js`, `app/simulator/monte-carlo-runner.js`, `app/simulator/simulator-bond-refill.js`, `app/simulator/simulator-engine-direct.js`, `app/simulator/simulator-forced-sale.js`, `app/simulator/stress-replay-comparison.js`, `app/simulator/stress-replay-contract.js`, `app/simulator/stress-replay-export.js`, `app/simulator/stress-replay-path-materializer.js`, `app/simulator/stress-replay-persistence.js`, `app/simulator/stress-replay-renderer.js`, `app/simulator/stress-replay-runner.js`, `app/simulator/stress-replay-transactions.js`, `app/simulator/stress-replay-ui.js`, `docs/internal/slice-stress-replay-korrektur-arbeitsplan-01-browser-harness-und-vollstaendiges-browser-gate.md`, `docs/internal/slice-stress-replay-korrektur-arbeitsplan-01-browser-harness-und-vollstandiges-browser-gate.md`, `docs/internal/slice-stress-replay-korrektur-arbeitsplan-02-varianten-whitelist-mit-belegten-prozentgrenzen.md`, `docs/internal/slice-stress-replay-korrektur-arbeitsplan-02-varianten-whitelist-mit-prozentgrenzen.md`, `docs/internal/slice-stress-replay-korrektur-arbeitsplan-03-kanonischer-marktstatus-vor-post-ruin-shadow.md`, `docs/internal/slice-stress-replay-korrektur-arbeitsplan-04-symmetrischer-terminalzustand-all-dead.md`, `docs/internal/slice-stress-replay-korrektur-arbeitsplan-05-explizite-missingness-bis-in-transaktions-breakdowns.md`, `docs/internal/slice-stress-replay-korrektur-arbeitsplan-05-explizite-transaktions-missingness.md`, `docs/internal/slice-stress-replay-korrektur-arbeitsplan-06-runner-capture-paritaet-im-echten-stressverkauf.md`, `docs/internal/slice-stress-replay-korrektur-arbeitsplan-06-runner-capture-paritaet-im-stressverkauf.md`, `docs/internal/slice-stress-replay-korrektur-arbeitsplan-07-produktiver-transaktionaler-persistenzpfad.md`, `docs/internal/slice-stress-replay-korrektur-arbeitsplan-08-busy-und-parallelitaetsvertrag-der-ui.md`, `docs/internal/slice-stress-replay-korrektur-arbeitsplan-09-unabhaengige-herkunftsidentitaet-bei-reload-und-import.md`, `docs/internal/slice-stress-replay-korrektur-arbeitsplan-09-unabhaengige-herkunftsidentitaet.md`, `docs/internal/slice-stress-replay-korrektur-arbeitsplan-10-eindeutige-kpi-deltadarstellung.md`, `docs/internal/slice-stress-replay-korrektur-arbeitsplan-11-abschlussbereinigung-dokumentationssync-und-gesamtgates.md`, `docs/reference/SIMULATOR_MODULES_README.md`, `docs/reference/TECHNICAL.md`, `tests/README.md`, `tests/browser-smoke.test.mjs`, `tests/persistence.test.mjs`, `tests/stress-replay-comparison.test.mjs`, `tests/stress-replay-contract.test.mjs`, `tests/stress-replay-e2e.test.mjs`, `tests/stress-replay-export.test.mjs`, `tests/stress-replay-persistence.test.mjs`, `tests/stress-replay-renderer.test.mjs`, `tests/stress-replay-runner.test.mjs`, `tests/stress-replay-transactions.test.mjs`, `tests/stress-replay-ui.test.mjs`, `tests/stress-replay-variant.test.mjs`, `tests/worker-parity.test.mjs`

## Orchestrator-Prüfprotokoll

### Review-Feedback von Claude

<!-- audit:claude-review:begin -->
#### Work Unit 01 – Planung

- Auftrag: Planung und Review der geordneten Implementierungsslices
- Scope: `README.md`, `app/shared/persistence-facade.js`, `app/simulator/monte-carlo-runner.js`, `app/simulator/simulator-bond-refill.js`, `app/simulator/simulator-engine-direct.js`, `app/simulator/simulator-forced-sale.js`, `app/simulator/stress-replay-comparison.js`, `app/simulator/stress-replay-contract.js`, `app/simulator/stress-replay-export.js`, `app/simulator/stress-replay-path-materializer.js`, `app/simulator/stress-replay-persistence.js`, `app/simulator/stress-replay-renderer.js`, `app/simulator/stress-replay-runner.js`, `app/simulator/stress-replay-transactions.js`, `app/simulator/stress-replay-ui.js`, `docs/internal/slice-stress-replay-korrektur-arbeitsplan-01-browser-harness-und-vollstaendiges-browser-gate.md`, `docs/internal/slice-stress-replay-korrektur-arbeitsplan-01-browser-harness-und-vollstandiges-browser-gate.md`, `docs/internal/slice-stress-replay-korrektur-arbeitsplan-02-varianten-whitelist-mit-belegten-prozentgrenzen.md`, `docs/internal/slice-stress-replay-korrektur-arbeitsplan-02-varianten-whitelist-mit-prozentgrenzen.md`, `docs/internal/slice-stress-replay-korrektur-arbeitsplan-03-kanonischer-marktstatus-vor-post-ruin-shadow.md`, `docs/internal/slice-stress-replay-korrektur-arbeitsplan-04-symmetrischer-terminalzustand-all-dead.md`, `docs/internal/slice-stress-replay-korrektur-arbeitsplan-05-explizite-missingness-bis-in-transaktions-breakdowns.md`, `docs/internal/slice-stress-replay-korrektur-arbeitsplan-05-explizite-transaktions-missingness.md`, `docs/internal/slice-stress-replay-korrektur-arbeitsplan-06-runner-capture-paritaet-im-echten-stressverkauf.md`, `docs/internal/slice-stress-replay-korrektur-arbeitsplan-06-runner-capture-paritaet-im-stressverkauf.md`, `docs/internal/slice-stress-replay-korrektur-arbeitsplan-07-produktiver-transaktionaler-persistenzpfad.md`, `docs/internal/slice-stress-replay-korrektur-arbeitsplan-08-busy-und-parallelitaetsvertrag-der-ui.md`, `docs/internal/slice-stress-replay-korrektur-arbeitsplan-09-unabhaengige-herkunftsidentitaet-bei-reload-und-import.md`, `docs/internal/slice-stress-replay-korrektur-arbeitsplan-09-unabhaengige-herkunftsidentitaet.md`, `docs/internal/slice-stress-replay-korrektur-arbeitsplan-10-eindeutige-kpi-deltadarstellung.md`, `docs/internal/slice-stress-replay-korrektur-arbeitsplan-11-abschlussbereinigung-dokumentationssync-und-gesamtgates.md`, `docs/internal/stress-replay-korrekturen-implement-review-02a8cb20.md`, `docs/reference/SIMULATOR_MODULES_README.md`, `docs/reference/TECHNICAL.md`, `tests/README.md`, `tests/browser-smoke.test.mjs`, `tests/persistence.test.mjs`, `tests/stress-replay-comparison.test.mjs`, `tests/stress-replay-contract.test.mjs`, `tests/stress-replay-e2e.test.mjs`, `tests/stress-replay-export.test.mjs`, `tests/stress-replay-persistence.test.mjs`, `tests/stress-replay-renderer.test.mjs`, `tests/stress-replay-runner.test.mjs`, `tests/stress-replay-transactions.test.mjs`, `tests/stress-replay-ui.test.mjs`, `tests/stress-replay-variant.test.mjs`, `tests/worker-parity.test.mjs`

Noch kein strukturiertes Reviewereignis.

#### Work Unit 02 – Slice 01

- Auftrag: Browser-Harness und vollständiges Browser-Gate
- Scope: `docs/internal/slice-stress-replay-korrektur-arbeitsplan-01-browser-harness-und-vollstaendiges-browser-gate.md`, `docs/internal/slice-stress-replay-korrektur-arbeitsplan-01-browser-harness-und-vollstandiges-browser-gate.md`, `docs/internal/stress-replay-korrekturen-implement-review-02a8cb20.md`, `tests/browser-smoke.test.mjs`

### Ereignis 2: Runde 1

- Reviewer: `claude`
- Freigabe: `YES`
- Validierungsbindung: `validation-fb5b283365a6`
- Testdateien: `tests/browser-smoke.test.mjs`
- Prüfdimensionen: scope/allowlist conformance, assertion-strength direction (strengthened vs. relaxed), fieldset/legend HTML5 disable-propagation semantics, fingerprint-binding of attestation, non-product-code blast radius
- Größtes Restrisiko: Largest residual risk: undetected legend-nesting or environment-skip could let the "disabled until executable path exists" gate silently regress in a later UI-touching slice (8/10) without the browser harness ever having proven it against a real browser
- Realistische Bruchbedingung: Break condition: &#96;#stressReplayVariantLabel&#96; moves inside &#96;#stressReplayVariantFields&#96;'s &#96;&lt;legend&gt;&#96;, or the orchestrator's browser runner silently skips Chromium-dependent specs while still reporting the suite as passed/required.
- Eigene Findings: `C-01`

#### Work Unit 03 – Slice 02

- Auftrag: Varianten-Whitelist mit belegten Prozentgrenzen
- Scope: `app/simulator/stress-replay-contract.js`, `docs/internal/slice-stress-replay-korrektur-arbeitsplan-02-varianten-whitelist-mit-belegten-prozentgrenzen.md`, `docs/internal/slice-stress-replay-korrektur-arbeitsplan-02-varianten-whitelist-mit-prozentgrenzen.md`, `docs/internal/stress-replay-korrekturen-implement-review-02a8cb20.md`, `tests/stress-replay-contract.test.mjs`, `tests/stress-replay-export.test.mjs`, `tests/stress-replay-variant.test.mjs`

### Ereignis 2: Runde 1

- Reviewer: `claude`
- Freigabe: `YES`
- Validierungsbindung: `validation-452abefeb86a`
- Testdateien: `tests/stress-replay-contract.test.mjs`, `tests/stress-replay-export.test.mjs`, `tests/stress-replay-variant.test.mjs`
- Eigene Findings: `C-01`

#### Work Unit 04 – Slice 03

- Auftrag: Kanonischer Marktstatus vor Post-Ruin-Shadow
- Scope: `app/simulator/monte-carlo-runner.js`, `docs/internal/slice-stress-replay-korrektur-arbeitsplan-03-kanonischer-marktstatus-vor-post-ruin-shadow.md`, `docs/internal/stress-replay-korrekturen-implement-review-02a8cb20.md`, `tests/worker-parity.test.mjs`

### Ereignis 2: Runde 1

- Reviewer: `claude`
- Freigabe: `YES`
- Validierungsbindung: `validation-b1417bdfd59b`
- Testdateien: `tests/worker-parity.test.mjs`
- Eigene Findings: `C-01`

#### Work Unit 05 – Slice 04

- Auftrag: Symmetrischer Terminalzustand all_dead
- Scope: `app/simulator/stress-replay-comparison.js`, `app/simulator/stress-replay-contract.js`, `app/simulator/stress-replay-runner.js`, `docs/internal/slice-stress-replay-korrektur-arbeitsplan-04-symmetrischer-terminalzustand-all-dead.md`, `docs/internal/stress-replay-korrekturen-implement-review-02a8cb20.md`, `tests/stress-replay-comparison.test.mjs`, `tests/stress-replay-export.test.mjs`, `tests/stress-replay-renderer.test.mjs`, `tests/stress-replay-runner.test.mjs`

### Ereignis 2: Runde 1

- Reviewer: `claude`
- Freigabe: `YES`
- Validierungsbindung: `validation-ba9259054cd4`
- Testdateien: `tests/stress-replay-comparison.test.mjs`, `tests/stress-replay-export.test.mjs`, `tests/stress-replay-renderer.test.mjs`, `tests/stress-replay-runner.test.mjs`
- Prüfdimensionen: correctness of terminal_death row emission and its portfolio/inflation values, contract fail-closed checks for missing/duplicate/inconsistent year-result status and missingness, all_dead single-terminal-row and last-row invariants, ruinYear-null invariant for all_dead, comparison-side explicit-null vs undefined fix and its serialization consequence, export/renderer downstream compatibility via generic row handling, scope containment to the allow-listed 9 files
- Größtes Restrisiko: Largest residual risk: immediate (yearIndex 0) all_dead death is contract-validated but not runner-execution-tested, so a future change to portfolio/inflation initialization order could silently produce wrong values for that specific edge case without any test catching it
- Realistische Bruchbedingung: Break condition: a maintainer changes state.portfolio or resolveSimulatorCumulativeInflationFactor initialization ordering relative to the death-check in the simulation loop, causing the very-first-year death row to report a stale or double-mutated portfolio value; the existing suite (death now always preceded by a financial year) would not detect this because it never exercises the zero-prior-year case.
- Eigene Findings: `C-02`

#### Work Unit 06 – Slice 05

- Auftrag: Explizite Missingness bis in Transaktions-Breakdowns
- Scope: `app/simulator/simulator-bond-refill.js`, `app/simulator/simulator-engine-direct.js`, `app/simulator/simulator-forced-sale.js`, `app/simulator/stress-replay-transactions.js`, `docs/internal/slice-stress-replay-korrektur-arbeitsplan-05-explizite-missingness-bis-in-transaktions-breakdowns.md`, `docs/internal/slice-stress-replay-korrektur-arbeitsplan-05-explizite-transaktions-missingness.md`, `docs/internal/stress-replay-korrekturen-implement-review-02a8cb20.md`, `tests/stress-replay-comparison.test.mjs`, `tests/stress-replay-transactions.test.mjs`

### Ereignis 2: Runde 1

- Reviewer: `claude`
- Freigabe: `YES`
- Validierungsbindung: `validation-bb6c135049dd`
- Testdateien: `tests/stress-replay-comparison.test.mjs`, `tests/stress-replay-transactions.test.mjs`
- Prüfdimensionen: Checked (1) event-vs-breakdown missingness scope discrimination, duplicate detection, and contradiction rejection in the rewritten &#96;normalizeMissingness&#96;/&#96;assertBreakdownReconciles&#96; in &#96;stress-replay-transactions.js&#96;; (2) the reconciliation invariant — when any breakdown value for a field is null, only &#96;knownSum &lt;= aggregate (+ tolerance)&#96; is enforced (correctly permitting unknown residuals), and when all breakdown values are known, exact equality within a relative epsilon is enforced; applied both at projection (&#96;buildStressReplayTransactionsForYear&#96;) and independently re-validated at aggregation (&#96;summarizeStressReplayTransactionsV1&#96;), giving tamper/replay resistance against corrupted persisted events; (3) producer correctness in &#96;simulator-bond-refill.js&#96;, &#96;simulator-engine-direct.js&#96;, &#96;simulator-forced-sale.js&#96; — null-guarded &#96;netEur&#96;/&#96;taxEur&#96; breakdown items are 1:1 paired with matching missingness reasons; the forced-sale eq/gold &#96;breakdownIndex&#96; shift (&#96;forcedExecutedEq&gt;0 ? 1 : 0&#96;) and the payout-fallback dual event+breakdown missingness entries are self-checking, because the contract layer independently cross-validates &#96;assetClass&#96;/&#96;field&#96;/&#96;breakdownIndex&#96; against the actual breakdown entry and fails closed on any mismatch rather than silently mis-tagging; (4) negative-path coverage in &#96;tests/stress-replay-transactions.test.mjs&#96; Test 4/4b exercises silent-null, negative, non-finite, aggregate-contradiction, empty-reason, unknown-field, unallocatable-forced-sale, and fully-known bond-refill cases; (5) &#96;tests/stress-replay-comparison.test.mjs&#96; confirms breakdown-scope reasons (not just event-scope) survive aggregation without being conflated with zero or with unrelated event reasons — the added &#96;scope !== 'breakdown'&#96; filter in &#96;normalizeOptionalMoney&#96;'s reason lookup is a real correctness fix versus prior code, which could otherwise have picked a breakdown-scoped reason string to justify an event-level null. No functional regression found in the supplied diff; the stricter &#96;typeof value !== 'number'&#96; checks and mandatory non-null &#96;grossEur&#96; on breakdown entries are intentional tightenings consistent with the "fail closed on silent nulls" goal and are exercised by the new tests.
- Größtes Restrisiko: Largest residual risk: the forced-sale eq/gold breakdown-index-to-assetClass mapping is hand-coded per branch condition rather than derived structurally from the breakdown array itself. It is safe today only because the contract layer's cross-validation (&#96;assetClass !== breakdownEntry.assetClass&#96;, etc.) throws on any future mismatch instead of silently mis-tagging — a correctness guard, but not a substitute for direct test coverage of a widened breakdown shape.
- Realistische Bruchbedingung: Break condition: a future producer change adds a third (e.g. bonds) bucket to the forced-sale or payout-fallback breakdown array in 3-bucket mode without adding the matching missingness branch/index arithmetic. &#96;buildStressReplayTransactionsForYear&#96; would then throw "Missing breakdown N.field requires explicit missingness" or an assetClass-mismatch TypeError at runtime for that new bucket — a fail-closed outcome — but only if some test path actually exercises a 3-bucket forced sale with a populated third breakdown bucket; no such test exists in the current scope, so the gap could persist undetected in review while remaining safely fail-closed in production.
- Eigene Findings: keine

#### Work Unit 07 – Slice 06

- Auftrag: Runner-Capture-Paritaet im echten Stressverkauf
- Scope: `app/simulator/simulator-engine-direct.js`, `app/simulator/stress-replay-runner.js`, `docs/internal/slice-stress-replay-korrektur-arbeitsplan-06-runner-capture-paritaet-im-echten-stressverkauf.md`, `docs/internal/slice-stress-replay-korrektur-arbeitsplan-06-runner-capture-paritaet-im-stressverkauf.md`, `docs/internal/stress-replay-korrekturen-implement-review-02a8cb20.md`, `tests/stress-replay-runner.test.mjs`, `tests/stress-replay-transactions.test.mjs`

### Ereignis 2: Runde 1

- Reviewer: `claude`
- Freigabe: `YES`
- Validierungsbindung: `validation-af5da6215f95`
- Testdateien: `tests/stress-replay-runner.test.mjs`
- Eigene Findings: `C-01`
<!-- audit:claude-review:end -->

### Review-Feedback von Antigravity

<!-- audit:antigravity-review:begin -->
#### Work Unit 01 – Planung

- Auftrag: Planung und Review der geordneten Implementierungsslices
- Scope: `README.md`, `app/shared/persistence-facade.js`, `app/simulator/monte-carlo-runner.js`, `app/simulator/simulator-bond-refill.js`, `app/simulator/simulator-engine-direct.js`, `app/simulator/simulator-forced-sale.js`, `app/simulator/stress-replay-comparison.js`, `app/simulator/stress-replay-contract.js`, `app/simulator/stress-replay-export.js`, `app/simulator/stress-replay-path-materializer.js`, `app/simulator/stress-replay-persistence.js`, `app/simulator/stress-replay-renderer.js`, `app/simulator/stress-replay-runner.js`, `app/simulator/stress-replay-transactions.js`, `app/simulator/stress-replay-ui.js`, `docs/internal/slice-stress-replay-korrektur-arbeitsplan-01-browser-harness-und-vollstaendiges-browser-gate.md`, `docs/internal/slice-stress-replay-korrektur-arbeitsplan-01-browser-harness-und-vollstandiges-browser-gate.md`, `docs/internal/slice-stress-replay-korrektur-arbeitsplan-02-varianten-whitelist-mit-belegten-prozentgrenzen.md`, `docs/internal/slice-stress-replay-korrektur-arbeitsplan-02-varianten-whitelist-mit-prozentgrenzen.md`, `docs/internal/slice-stress-replay-korrektur-arbeitsplan-03-kanonischer-marktstatus-vor-post-ruin-shadow.md`, `docs/internal/slice-stress-replay-korrektur-arbeitsplan-04-symmetrischer-terminalzustand-all-dead.md`, `docs/internal/slice-stress-replay-korrektur-arbeitsplan-05-explizite-missingness-bis-in-transaktions-breakdowns.md`, `docs/internal/slice-stress-replay-korrektur-arbeitsplan-05-explizite-transaktions-missingness.md`, `docs/internal/slice-stress-replay-korrektur-arbeitsplan-06-runner-capture-paritaet-im-echten-stressverkauf.md`, `docs/internal/slice-stress-replay-korrektur-arbeitsplan-06-runner-capture-paritaet-im-stressverkauf.md`, `docs/internal/slice-stress-replay-korrektur-arbeitsplan-07-produktiver-transaktionaler-persistenzpfad.md`, `docs/internal/slice-stress-replay-korrektur-arbeitsplan-08-busy-und-parallelitaetsvertrag-der-ui.md`, `docs/internal/slice-stress-replay-korrektur-arbeitsplan-09-unabhaengige-herkunftsidentitaet-bei-reload-und-import.md`, `docs/internal/slice-stress-replay-korrektur-arbeitsplan-09-unabhaengige-herkunftsidentitaet.md`, `docs/internal/slice-stress-replay-korrektur-arbeitsplan-10-eindeutige-kpi-deltadarstellung.md`, `docs/internal/slice-stress-replay-korrektur-arbeitsplan-11-abschlussbereinigung-dokumentationssync-und-gesamtgates.md`, `docs/internal/stress-replay-korrekturen-implement-review-02a8cb20.md`, `docs/reference/SIMULATOR_MODULES_README.md`, `docs/reference/TECHNICAL.md`, `tests/README.md`, `tests/browser-smoke.test.mjs`, `tests/persistence.test.mjs`, `tests/stress-replay-comparison.test.mjs`, `tests/stress-replay-contract.test.mjs`, `tests/stress-replay-e2e.test.mjs`, `tests/stress-replay-export.test.mjs`, `tests/stress-replay-persistence.test.mjs`, `tests/stress-replay-renderer.test.mjs`, `tests/stress-replay-runner.test.mjs`, `tests/stress-replay-transactions.test.mjs`, `tests/stress-replay-ui.test.mjs`, `tests/stress-replay-variant.test.mjs`, `tests/worker-parity.test.mjs`

Noch kein strukturiertes Reviewereignis.

#### Work Unit 02 – Slice 01

- Auftrag: Browser-Harness und vollständiges Browser-Gate
- Scope: `docs/internal/slice-stress-replay-korrektur-arbeitsplan-01-browser-harness-und-vollstaendiges-browser-gate.md`, `docs/internal/slice-stress-replay-korrektur-arbeitsplan-01-browser-harness-und-vollstandiges-browser-gate.md`, `docs/internal/stress-replay-korrekturen-implement-review-02a8cb20.md`, `tests/browser-smoke.test.mjs`

### Ereignis 3: Runde 1

- Reviewer: `antigravity`
- Freigabe: `YES`
- Validierungsbindung: `validation-fb5b283365a6`
- Testdateien: `tests/browser-smoke.test.mjs`
- Prüfdimensionen: scope and path allowlist compliance, fieldset and input HTML5 disabled-state semantics, DOM property and attribute assertion strength, status message assertions, zero-product-code blast radius, and test harness execution policy
- Größtes Restrisiko: If markup changes in subsequent UI slices move form controls outside #stressReplayVariantFields or into a legend element, disabled-state propagation in HTML5 would differ and could allow user input unexpectedly
- Realistische Bruchbedingung: Placing #stressReplayVariantLabel inside the &lt;legend&gt; element of #stressReplayVariantFields would exempt it from fieldset-level disabling under standard HTML5 form semantics while property checks on the fieldset itself still pass.
- Eigene Findings: keine

#### Work Unit 03 – Slice 02

- Auftrag: Varianten-Whitelist mit belegten Prozentgrenzen
- Scope: `app/simulator/stress-replay-contract.js`, `docs/internal/slice-stress-replay-korrektur-arbeitsplan-02-varianten-whitelist-mit-belegten-prozentgrenzen.md`, `docs/internal/slice-stress-replay-korrektur-arbeitsplan-02-varianten-whitelist-mit-prozentgrenzen.md`, `docs/internal/stress-replay-korrekturen-implement-review-02a8cb20.md`, `tests/stress-replay-contract.test.mjs`, `tests/stress-replay-export.test.mjs`, `tests/stress-replay-variant.test.mjs`

### Ereignis 3: Runde 1

- Reviewer: `antigravity`
- Freigabe: `YES`
- Validierungsbindung: `validation-452abefeb86a`
- Testdateien: `tests/stress-replay-contract.test.mjs`, `tests/stress-replay-export.test.mjs`, `tests/stress-replay-variant.test.mjs`
- Prüfdimensionen: Contract boundary validation, domain range enforcement [0, 50] and [0, 70], non-finite rejection (NaN/Infinity), patch normalization, variant factory validation, and export fingerprint tamper resistance
- Größtes Restrisiko: Stored workspace records created under prior unvalidated bounds could encounter strict deserialization rejection in downstream slices if persistence and import workflows expect automated legacy migration
- Realistische Bruchbedingung: A legacy workspace or export with maxSkimPctOfEq &gt; 50 or maxBearRefillPctOfEq &gt; 70 is imported and fails closed with STRESS_REPLAY_CONTRACT_INVALID rather than undergoing schema migration or surfacing actionable diagnostic guidance
- Eigene Findings: keine

#### Work Unit 04 – Slice 03

- Auftrag: Kanonischer Marktstatus vor Post-Ruin-Shadow
- Scope: `app/simulator/monte-carlo-runner.js`, `docs/internal/slice-stress-replay-korrektur-arbeitsplan-03-kanonischer-marktstatus-vor-post-ruin-shadow.md`, `docs/internal/stress-replay-korrekturen-implement-review-02a8cb20.md`, `tests/worker-parity.test.mjs`

### Ereignis 3: Runde 1

- Reviewer: `antigravity`
- Freigabe: `YES`
- Validierungsbindung: `validation-b1417bdfd59b`
- Testdateien: `tests/worker-parity.test.mjs`
- Prüfdimensionen: canonical market state advancement on terminal ruin, post-ruin shadow CAPE inheritance and path progression, non-captured Monte Carlo run isolation and financial parity, strict year index monotonicity, and test fixture cleanup safety via try/finally
- Größtes Restrisiko: Future refactoring in monte-carlo-runner.js that decouples or relaxes BREAK_ON_RUIN while stress-replay capture is enabled, causing simState.marketDataHist advancement to execute during an active loop iteration rather than terminating live simulation
- Realistische Bruchbedingung: A custom runner configuration or test where BREAK_ON_RUIN is overridden to false while stressReplayCapture is active, allowing the terminal ruin market update to leak into subsequent non-shadow simulation steps and diverge financial outcomes against uncaptured runs
- Eigene Findings: keine

#### Work Unit 05 – Slice 04

- Auftrag: Symmetrischer Terminalzustand all_dead
- Scope: `app/simulator/stress-replay-comparison.js`, `app/simulator/stress-replay-contract.js`, `app/simulator/stress-replay-runner.js`, `docs/internal/slice-stress-replay-korrektur-arbeitsplan-04-symmetrischer-terminalzustand-all-dead.md`, `docs/internal/stress-replay-korrekturen-implement-review-02a8cb20.md`, `tests/stress-replay-comparison.test.mjs`, `tests/stress-replay-export.test.mjs`, `tests/stress-replay-renderer.test.mjs`, `tests/stress-replay-runner.test.mjs`

### Ereignis 3: Runde 1

- Reviewer: `antigravity`
- Freigabe: `YES`
- Validierungsbindung: `validation-ba9259054cd4`
- Testdateien: `tests/stress-replay-comparison.test.mjs`, `tests/stress-replay-export.test.mjs`, `tests/stress-replay-renderer.test.mjs`, `tests/stress-replay-runner.test.mjs`
- Prüfdimensionen: contract validation of terminal_death year records and all_dead terminal summary invariants
- Größtes Restrisiko: comparison-side explicit null projection for asymmetric survival horizons
- Realistische Bruchbedingung: runner emission of terminal death rows with unmutated portfolio snapshots, explicit null withdrawals/taxes, and field-level missingness &#124; renderer and export compatibility with terminal death rows &#124; scope containment across the allowlisted 9 files &#124; A future refactoring in the runner simulation loop mutates state.portfolio before branching on terminal_death, silently corrupting the reported death row valuation on multi-year paths &#124; A future change adds pre-loop fee deductions or cash adjustments at the start of each iteration before the recordType === 'terminal_death' check, leaking non-zero deductions into the terminal death snapshot
- Eigene Findings: keine

#### Work Unit 06 – Slice 05

- Auftrag: Explizite Missingness bis in Transaktions-Breakdowns
- Scope: `app/simulator/simulator-bond-refill.js`, `app/simulator/simulator-engine-direct.js`, `app/simulator/simulator-forced-sale.js`, `app/simulator/stress-replay-transactions.js`, `docs/internal/slice-stress-replay-korrektur-arbeitsplan-05-explizite-missingness-bis-in-transaktions-breakdowns.md`, `docs/internal/slice-stress-replay-korrektur-arbeitsplan-05-explizite-transaktions-missingness.md`, `docs/internal/stress-replay-korrekturen-implement-review-02a8cb20.md`, `tests/stress-replay-comparison.test.mjs`, `tests/stress-replay-transactions.test.mjs`

### Ereignis 3: Runde 1

- Reviewer: `antigravity`
- Freigabe: `YES`
- Validierungsbindung: `validation-bb6c135049dd`
- Testdateien: `tests/stress-replay-comparison.test.mjs`, `tests/stress-replay-transactions.test.mjs`
- Prüfdimensionen: Scope compliance across all 8 allowlisted files (app/simulator/simulator-bond-refill.js, app/simulator/simulator-engine-direct.js, app/simulator/simulator-forced-sale.js, app/simulator/stress-replay-transactions.js, docs/internal/slice-stress-replay-korrektur-arbeitsplan-05-explizite-missingness-bis-in-transaktions-breakdowns.md, docs/internal/stress-replay-korrekturen-implement-review-02a8cb20.md, tests/stress-replay-comparison.test.mjs, tests/stress-replay-transactions.test.mjs); event-vs-breakdown missingness scoping and discrimination in normalizeMissingness, normalizeOptionalMoney, and assertBreakdownReconciles; strict type verification (typeof value === 'number', finite, non-negative) eliminating previous silent null-to-zero coercions; aggregate-to-breakdown reconciliation invariants under complete and partial missingness; producer correctness across forced sales, payout fallback, bond refills, and regular engine sales; aggregation preservation of breakdown missingness metadata in summarizeStressReplayTransactionsV1; comprehensive adversarial negative-path and regression test coverage
- Größtes Restrisiko: Index-to-asset-class mapping in simulator-forced-sale.js relies on branch-specific manual index arithmetic (forcedExecutedEq &gt; 0 ? 1 : 0) rather than structural derivation from the breakdown array, relying on the contract layer's strict runtime cross-validation (assetClass !== breakdownEntry.assetClass) to fail closed on any drift
- Realistische Bruchbedingung: A maintainer adds a third asset class (e.g. a distinct geldmarkt tranche) to simulator-forced-sale.js in 3-bucket mode without adapting the hard-coded missingness index offsets; buildStressReplayTransactionsForYear would fail closed with an assetClass or index mismatch TypeError, but the failure would only surface when a test or run exercises that specific multi-asset forced-sale configuration
- Eigene Findings: keine

#### Work Unit 07 – Slice 06

- Auftrag: Runner-Capture-Paritaet im echten Stressverkauf
- Scope: `app/simulator/simulator-engine-direct.js`, `app/simulator/stress-replay-runner.js`, `docs/internal/slice-stress-replay-korrektur-arbeitsplan-06-runner-capture-paritaet-im-echten-stressverkauf.md`, `docs/internal/slice-stress-replay-korrektur-arbeitsplan-06-runner-capture-paritaet-im-stressverkauf.md`, `docs/internal/stress-replay-korrekturen-implement-review-02a8cb20.md`, `tests/stress-replay-runner.test.mjs`, `tests/stress-replay-transactions.test.mjs`

### Ereignis 3: Runde 1

- Reviewer: `antigravity`
- Freigabe: `YES`
- Validierungsbindung: `validation-af5da6215f95`
- Testdateien: `tests/stress-replay-runner.test.mjs`
- Prüfdimensionen: Implementation correctness of &#96;captureTransactions&#96; flag propagation to engine inputs; backward-compatible default behavior (&#96;captureTransactions = true&#96;); strict diagnostic isolation ensuring zero financial KPI / summary / yearly result divergence between capture-on and capture-off runs; trace phase purity ensuring only the additive &#96;after_payout_fallback&#96; entry is appended without mutating surrounding trace ordering; input immutability of &#96;crashPath&#96; and &#96;crashInputs&#96;; byte-level replay determinism across repeated runs
- Größtes Restrisiko: Downstream callers or external integration scripts passing truthy non-boolean values (such as &#96;"true"&#96; or &#96;1&#96; parsed from query parameters or CLI arguments) directly into &#96;runStressReplayPathV1({ captureTransactions })&#96;, where strict &#96;=== true&#96; comparison silently disables transaction capture without throwing an error
- Realistische Bruchbedingung: A CLI command or UI URL parameter parser forwards uncoerced string &#96;"true"&#96; to &#96;runStressReplayPathV1&#96;, causing transaction capture to be disabled and resulting in empty transaction arrays despite active forced sales occurring during simulation
- Eigene Findings: keine
<!-- audit:antigravity-review:end -->

### Review-Antworten von Codex

<!-- audit:codex-responses:begin -->
#### Work Unit 01 – Planung

- Auftrag: Planung und Review der geordneten Implementierungsslices
- Scope: `README.md`, `app/shared/persistence-facade.js`, `app/simulator/monte-carlo-runner.js`, `app/simulator/simulator-bond-refill.js`, `app/simulator/simulator-engine-direct.js`, `app/simulator/simulator-forced-sale.js`, `app/simulator/stress-replay-comparison.js`, `app/simulator/stress-replay-contract.js`, `app/simulator/stress-replay-export.js`, `app/simulator/stress-replay-path-materializer.js`, `app/simulator/stress-replay-persistence.js`, `app/simulator/stress-replay-renderer.js`, `app/simulator/stress-replay-runner.js`, `app/simulator/stress-replay-transactions.js`, `app/simulator/stress-replay-ui.js`, `docs/internal/slice-stress-replay-korrektur-arbeitsplan-01-browser-harness-und-vollstaendiges-browser-gate.md`, `docs/internal/slice-stress-replay-korrektur-arbeitsplan-01-browser-harness-und-vollstandiges-browser-gate.md`, `docs/internal/slice-stress-replay-korrektur-arbeitsplan-02-varianten-whitelist-mit-belegten-prozentgrenzen.md`, `docs/internal/slice-stress-replay-korrektur-arbeitsplan-02-varianten-whitelist-mit-prozentgrenzen.md`, `docs/internal/slice-stress-replay-korrektur-arbeitsplan-03-kanonischer-marktstatus-vor-post-ruin-shadow.md`, `docs/internal/slice-stress-replay-korrektur-arbeitsplan-04-symmetrischer-terminalzustand-all-dead.md`, `docs/internal/slice-stress-replay-korrektur-arbeitsplan-05-explizite-missingness-bis-in-transaktions-breakdowns.md`, `docs/internal/slice-stress-replay-korrektur-arbeitsplan-05-explizite-transaktions-missingness.md`, `docs/internal/slice-stress-replay-korrektur-arbeitsplan-06-runner-capture-paritaet-im-echten-stressverkauf.md`, `docs/internal/slice-stress-replay-korrektur-arbeitsplan-06-runner-capture-paritaet-im-stressverkauf.md`, `docs/internal/slice-stress-replay-korrektur-arbeitsplan-07-produktiver-transaktionaler-persistenzpfad.md`, `docs/internal/slice-stress-replay-korrektur-arbeitsplan-08-busy-und-parallelitaetsvertrag-der-ui.md`, `docs/internal/slice-stress-replay-korrektur-arbeitsplan-09-unabhaengige-herkunftsidentitaet-bei-reload-und-import.md`, `docs/internal/slice-stress-replay-korrektur-arbeitsplan-09-unabhaengige-herkunftsidentitaet.md`, `docs/internal/slice-stress-replay-korrektur-arbeitsplan-10-eindeutige-kpi-deltadarstellung.md`, `docs/internal/slice-stress-replay-korrektur-arbeitsplan-11-abschlussbereinigung-dokumentationssync-und-gesamtgates.md`, `docs/internal/stress-replay-korrekturen-implement-review-02a8cb20.md`, `docs/reference/SIMULATOR_MODULES_README.md`, `docs/reference/TECHNICAL.md`, `tests/README.md`, `tests/browser-smoke.test.mjs`, `tests/persistence.test.mjs`, `tests/stress-replay-comparison.test.mjs`, `tests/stress-replay-contract.test.mjs`, `tests/stress-replay-e2e.test.mjs`, `tests/stress-replay-export.test.mjs`, `tests/stress-replay-persistence.test.mjs`, `tests/stress-replay-renderer.test.mjs`, `tests/stress-replay-runner.test.mjs`, `tests/stress-replay-transactions.test.mjs`, `tests/stress-replay-ui.test.mjs`, `tests/stress-replay-variant.test.mjs`, `tests/worker-parity.test.mjs`

Noch keine strukturierten Codex-Antworten.

#### Work Unit 02 – Slice 01

- Auftrag: Browser-Harness und vollständiges Browser-Gate
- Scope: `docs/internal/slice-stress-replay-korrektur-arbeitsplan-01-browser-harness-und-vollstaendiges-browser-gate.md`, `docs/internal/slice-stress-replay-korrektur-arbeitsplan-01-browser-harness-und-vollstandiges-browser-gate.md`, `docs/internal/stress-replay-korrekturen-implement-review-02a8cb20.md`, `tests/browser-smoke.test.mjs`

Noch keine strukturierten Codex-Antworten.

#### Work Unit 03 – Slice 02

- Auftrag: Varianten-Whitelist mit belegten Prozentgrenzen
- Scope: `app/simulator/stress-replay-contract.js`, `docs/internal/slice-stress-replay-korrektur-arbeitsplan-02-varianten-whitelist-mit-belegten-prozentgrenzen.md`, `docs/internal/slice-stress-replay-korrektur-arbeitsplan-02-varianten-whitelist-mit-prozentgrenzen.md`, `docs/internal/stress-replay-korrekturen-implement-review-02a8cb20.md`, `tests/stress-replay-contract.test.mjs`, `tests/stress-replay-export.test.mjs`, `tests/stress-replay-variant.test.mjs`

Noch keine strukturierten Codex-Antworten.

#### Work Unit 04 – Slice 03

- Auftrag: Kanonischer Marktstatus vor Post-Ruin-Shadow
- Scope: `app/simulator/monte-carlo-runner.js`, `docs/internal/slice-stress-replay-korrektur-arbeitsplan-03-kanonischer-marktstatus-vor-post-ruin-shadow.md`, `docs/internal/stress-replay-korrekturen-implement-review-02a8cb20.md`, `tests/worker-parity.test.mjs`

Noch keine strukturierten Codex-Antworten.

#### Work Unit 05 – Slice 04

- Auftrag: Symmetrischer Terminalzustand all_dead
- Scope: `app/simulator/stress-replay-comparison.js`, `app/simulator/stress-replay-contract.js`, `app/simulator/stress-replay-runner.js`, `docs/internal/slice-stress-replay-korrektur-arbeitsplan-04-symmetrischer-terminalzustand-all-dead.md`, `docs/internal/stress-replay-korrekturen-implement-review-02a8cb20.md`, `tests/stress-replay-comparison.test.mjs`, `tests/stress-replay-export.test.mjs`, `tests/stress-replay-renderer.test.mjs`, `tests/stress-replay-runner.test.mjs`

Noch keine strukturierten Codex-Antworten.

#### Work Unit 06 – Slice 05

- Auftrag: Explizite Missingness bis in Transaktions-Breakdowns
- Scope: `app/simulator/simulator-bond-refill.js`, `app/simulator/simulator-engine-direct.js`, `app/simulator/simulator-forced-sale.js`, `app/simulator/stress-replay-transactions.js`, `docs/internal/slice-stress-replay-korrektur-arbeitsplan-05-explizite-missingness-bis-in-transaktions-breakdowns.md`, `docs/internal/slice-stress-replay-korrektur-arbeitsplan-05-explizite-transaktions-missingness.md`, `docs/internal/stress-replay-korrekturen-implement-review-02a8cb20.md`, `tests/stress-replay-comparison.test.mjs`, `tests/stress-replay-transactions.test.mjs`

Noch keine strukturierten Codex-Antworten.

#### Work Unit 07 – Slice 06

- Auftrag: Runner-Capture-Paritaet im echten Stressverkauf
- Scope: `app/simulator/simulator-engine-direct.js`, `app/simulator/stress-replay-runner.js`, `docs/internal/slice-stress-replay-korrektur-arbeitsplan-06-runner-capture-paritaet-im-echten-stressverkauf.md`, `docs/internal/slice-stress-replay-korrektur-arbeitsplan-06-runner-capture-paritaet-im-stressverkauf.md`, `docs/internal/stress-replay-korrekturen-implement-review-02a8cb20.md`, `tests/stress-replay-runner.test.mjs`, `tests/stress-replay-transactions.test.mjs`

Noch keine strukturierten Codex-Antworten.
<!-- audit:codex-responses:end -->

### Validierungsattestierung

<!-- audit:validation-attestation:begin -->
#### Work Unit 01 – Planung

- Auftrag: Planung und Review der geordneten Implementierungsslices
- Scope: `README.md`, `app/shared/persistence-facade.js`, `app/simulator/monte-carlo-runner.js`, `app/simulator/simulator-bond-refill.js`, `app/simulator/simulator-engine-direct.js`, `app/simulator/simulator-forced-sale.js`, `app/simulator/stress-replay-comparison.js`, `app/simulator/stress-replay-contract.js`, `app/simulator/stress-replay-export.js`, `app/simulator/stress-replay-path-materializer.js`, `app/simulator/stress-replay-persistence.js`, `app/simulator/stress-replay-renderer.js`, `app/simulator/stress-replay-runner.js`, `app/simulator/stress-replay-transactions.js`, `app/simulator/stress-replay-ui.js`, `docs/internal/slice-stress-replay-korrektur-arbeitsplan-01-browser-harness-und-vollstaendiges-browser-gate.md`, `docs/internal/slice-stress-replay-korrektur-arbeitsplan-01-browser-harness-und-vollstandiges-browser-gate.md`, `docs/internal/slice-stress-replay-korrektur-arbeitsplan-02-varianten-whitelist-mit-belegten-prozentgrenzen.md`, `docs/internal/slice-stress-replay-korrektur-arbeitsplan-02-varianten-whitelist-mit-prozentgrenzen.md`, `docs/internal/slice-stress-replay-korrektur-arbeitsplan-03-kanonischer-marktstatus-vor-post-ruin-shadow.md`, `docs/internal/slice-stress-replay-korrektur-arbeitsplan-04-symmetrischer-terminalzustand-all-dead.md`, `docs/internal/slice-stress-replay-korrektur-arbeitsplan-05-explizite-missingness-bis-in-transaktions-breakdowns.md`, `docs/internal/slice-stress-replay-korrektur-arbeitsplan-05-explizite-transaktions-missingness.md`, `docs/internal/slice-stress-replay-korrektur-arbeitsplan-06-runner-capture-paritaet-im-echten-stressverkauf.md`, `docs/internal/slice-stress-replay-korrektur-arbeitsplan-06-runner-capture-paritaet-im-stressverkauf.md`, `docs/internal/slice-stress-replay-korrektur-arbeitsplan-07-produktiver-transaktionaler-persistenzpfad.md`, `docs/internal/slice-stress-replay-korrektur-arbeitsplan-08-busy-und-parallelitaetsvertrag-der-ui.md`, `docs/internal/slice-stress-replay-korrektur-arbeitsplan-09-unabhaengige-herkunftsidentitaet-bei-reload-und-import.md`, `docs/internal/slice-stress-replay-korrektur-arbeitsplan-09-unabhaengige-herkunftsidentitaet.md`, `docs/internal/slice-stress-replay-korrektur-arbeitsplan-10-eindeutige-kpi-deltadarstellung.md`, `docs/internal/slice-stress-replay-korrektur-arbeitsplan-11-abschlussbereinigung-dokumentationssync-und-gesamtgates.md`, `docs/internal/stress-replay-korrekturen-implement-review-02a8cb20.md`, `docs/reference/SIMULATOR_MODULES_README.md`, `docs/reference/TECHNICAL.md`, `tests/README.md`, `tests/browser-smoke.test.mjs`, `tests/persistence.test.mjs`, `tests/stress-replay-comparison.test.mjs`, `tests/stress-replay-contract.test.mjs`, `tests/stress-replay-e2e.test.mjs`, `tests/stress-replay-export.test.mjs`, `tests/stress-replay-persistence.test.mjs`, `tests/stress-replay-renderer.test.mjs`, `tests/stress-replay-runner.test.mjs`, `tests/stress-replay-transactions.test.mjs`, `tests/stress-replay-ui.test.mjs`, `tests/stress-replay-variant.test.mjs`, `tests/worker-parity.test.mjs`

Noch keine strukturierte Validierungsattestierung.

#### Work Unit 02 – Slice 01

- Auftrag: Browser-Harness und vollständiges Browser-Gate
- Scope: `docs/internal/slice-stress-replay-korrektur-arbeitsplan-01-browser-harness-und-vollstaendiges-browser-gate.md`, `docs/internal/slice-stress-replay-korrektur-arbeitsplan-01-browser-harness-und-vollstandiges-browser-gate.md`, `docs/internal/stress-replay-korrekturen-implement-review-02a8cb20.md`, `tests/browser-smoke.test.mjs`

### Ereignis 1: `validation-fb5b283365a6`

- Diff-Fingerprint: `fb5b283365a6029363aa1b1e798476e34c8fb0bd7606e99d484d6cfe48ebd33a`
- Status: `PASS`
- Vollständig: `YES`
- Kurzresultat: 1 passed; 0 failed; 0 unavailable; 1 required
- Ausgabedigest: `ff960eafec6318afcce7a9bfc39b8ab9de0f40df673efc948c0c86c3c47826b4`

| Matrixbefehl | Status | Exitcode | Kompaktausgabe |
|---|---|---:|---|
| shell: npm test | PASS | 0 | &gt; ruhestand-app-final@1.0.0 test<br>&gt; node tests/run-tests.mjs<br><br>🚀 Starting Test Runner...<br>Found 180 test files.<br><br>📂 Running 3bucket-config.test.mjs in process...<br>--- 3-Bucket Config Tests ---<br>✅ 3-Bucket config tests passed<br>✅ 3bucket-config.test.mjs completed.<br>📊 FILE RESULT: 3bucket-config.test.mjs &#124; mode=in-process &#124; assertions=17 &#124; passed=17 &#124; failedAssertions=0 &#124; failedFiles=0<br><br>📂 Running 3bucket-refill.test.mjs in process...<br>--- 3-Bucket Refill Tests ---<br>✅ 3-Bucket refill tests passed<br>✅ 3bucket-refill.test.mjs completed.<br>📊 FILE RESULT: 3bucket-refill.test.mjs &#124; mode=in-process &#124; assertions=32 &#124; passed=32 &#124; failedAssertions=0 &#124; failedFiles=0<br><br>📂 Running architecture-evidence.test.mjs in process...<br>--- Architecture Evidence Contract Tests ---<br>✅ Architecture evidence contract tests passed<br>✅ architecture-evidence.test.mjs completed.<br>📊 FILE RESULT: architecture-evidence.test.mjs &#124; mode=in-process &#124; assertions=24 &#124; passed=24 &#124; failedAssertions=0 &#124; failedFiles=0<br><br>📂 Running auto-optimize-fidelity<br>...[182495 characters omitted]...<br>ete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/app/profile/profile-storage.js:537:28)<br>    at initProfileSubpageLifecycle (file:///mnt/c/Users/Diete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/app/profile/profile-navigation.js:157:5)<br>    at initProfileBridge (file:///mnt/c/Users/Diete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/app/profile/profile-bridge.js:8:5)<br>    at async Promise.all (index 0)<br>    at async MockDocument.dispatch (file:///mnt/c/Users/Diete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/tests/profile-ui-contract.test.mjs:80:9)<br>    at async runProfileUiContractTests (file:///mnt/c/Users/Diete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/tests/profile-ui-contract.test.mjs:244:9)<br>    at async file:///mnt/c/Users/Diete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/tests/profile-ui-contract.test.mjs:257:9<br>[VALIDATION ERROR] Invalid input fields: [<br>  {<br>    fieldId: 'goGoMultiplier',<br>    message: 'goGoMultiplier muss zwischen 1.0 und 1.5 liegen.'<br>  }<br>] |

#### Work Unit 03 – Slice 02

- Auftrag: Varianten-Whitelist mit belegten Prozentgrenzen
- Scope: `app/simulator/stress-replay-contract.js`, `docs/internal/slice-stress-replay-korrektur-arbeitsplan-02-varianten-whitelist-mit-belegten-prozentgrenzen.md`, `docs/internal/slice-stress-replay-korrektur-arbeitsplan-02-varianten-whitelist-mit-prozentgrenzen.md`, `docs/internal/stress-replay-korrekturen-implement-review-02a8cb20.md`, `tests/stress-replay-contract.test.mjs`, `tests/stress-replay-export.test.mjs`, `tests/stress-replay-variant.test.mjs`

### Ereignis 1: `validation-452abefeb86a`

- Diff-Fingerprint: `452abefeb86ae215d6d683c350761a6d63a33de1cf060a95b9fd743cb9d9a10c`
- Status: `PASS`
- Vollständig: `YES`
- Kurzresultat: 1 passed; 0 failed; 0 unavailable; 1 required
- Ausgabedigest: `64ba5cff7e85284213898ae4dec8a52f1cc5f65777d4f7c950eca1d9227f0c92`

| Matrixbefehl | Status | Exitcode | Kompaktausgabe |
|---|---|---:|---|
| shell: npm test | PASS | 0 | &gt; ruhestand-app-final@1.0.0 test<br>&gt; node tests/run-tests.mjs<br><br>🚀 Starting Test Runner...<br>Found 180 test files.<br><br>📂 Running 3bucket-config.test.mjs in process...<br>--- 3-Bucket Config Tests ---<br>✅ 3-Bucket config tests passed<br>✅ 3bucket-config.test.mjs completed.<br>📊 FILE RESULT: 3bucket-config.test.mjs &#124; mode=in-process &#124; assertions=17 &#124; passed=17 &#124; failedAssertions=0 &#124; failedFiles=0<br><br>📂 Running 3bucket-refill.test.mjs in process...<br>--- 3-Bucket Refill Tests ---<br>✅ 3-Bucket refill tests passed<br>✅ 3bucket-refill.test.mjs completed.<br>📊 FILE RESULT: 3bucket-refill.test.mjs &#124; mode=in-process &#124; assertions=32 &#124; passed=32 &#124; failedAssertions=0 &#124; failedFiles=0<br><br>📂 Running architecture-evidence.test.mjs in process...<br>--- Architecture Evidence Contract Tests ---<br>✅ Architecture evidence contract tests passed<br>✅ architecture-evidence.test.mjs completed.<br>📊 FILE RESULT: architecture-evidence.test.mjs &#124; mode=in-process &#124; assertions=24 &#124; passed=24 &#124; failedAssertions=0 &#124; failedFiles=0<br><br>📂 Running auto-optimize-fidelity<br>...[182495 characters omitted]...<br>ete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/app/profile/profile-storage.js:537:28)<br>    at initProfileSubpageLifecycle (file:///mnt/c/Users/Diete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/app/profile/profile-navigation.js:157:5)<br>    at initProfileBridge (file:///mnt/c/Users/Diete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/app/profile/profile-bridge.js:8:5)<br>    at async Promise.all (index 0)<br>    at async MockDocument.dispatch (file:///mnt/c/Users/Diete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/tests/profile-ui-contract.test.mjs:80:9)<br>    at async runProfileUiContractTests (file:///mnt/c/Users/Diete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/tests/profile-ui-contract.test.mjs:244:9)<br>    at async file:///mnt/c/Users/Diete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/tests/profile-ui-contract.test.mjs:257:9<br>[VALIDATION ERROR] Invalid input fields: [<br>  {<br>    fieldId: 'goGoMultiplier',<br>    message: 'goGoMultiplier muss zwischen 1.0 und 1.5 liegen.'<br>  }<br>] |

#### Work Unit 04 – Slice 03

- Auftrag: Kanonischer Marktstatus vor Post-Ruin-Shadow
- Scope: `app/simulator/monte-carlo-runner.js`, `docs/internal/slice-stress-replay-korrektur-arbeitsplan-03-kanonischer-marktstatus-vor-post-ruin-shadow.md`, `docs/internal/stress-replay-korrekturen-implement-review-02a8cb20.md`, `tests/worker-parity.test.mjs`

### Ereignis 1: `validation-b1417bdfd59b`

- Diff-Fingerprint: `b1417bdfd59b7965643853c87819353a1675e9ff8136cbf5aec46290c81b25a8`
- Status: `PASS`
- Vollständig: `YES`
- Kurzresultat: 1 passed; 0 failed; 0 unavailable; 1 required
- Ausgabedigest: `3a2c7275f059e0571ed22bfa4941d306d223b8c17a95d9b86b89e955308e3462`

| Matrixbefehl | Status | Exitcode | Kompaktausgabe |
|---|---|---:|---|
| shell: npm test | PASS | 0 | &gt; ruhestand-app-final@1.0.0 test<br>&gt; node tests/run-tests.mjs<br><br>🚀 Starting Test Runner...<br>Found 180 test files.<br><br>📂 Running 3bucket-config.test.mjs in process...<br>--- 3-Bucket Config Tests ---<br>✅ 3-Bucket config tests passed<br>✅ 3bucket-config.test.mjs completed.<br>📊 FILE RESULT: 3bucket-config.test.mjs &#124; mode=in-process &#124; assertions=17 &#124; passed=17 &#124; failedAssertions=0 &#124; failedFiles=0<br><br>📂 Running 3bucket-refill.test.mjs in process...<br>--- 3-Bucket Refill Tests ---<br>✅ 3-Bucket refill tests passed<br>✅ 3bucket-refill.test.mjs completed.<br>📊 FILE RESULT: 3bucket-refill.test.mjs &#124; mode=in-process &#124; assertions=32 &#124; passed=32 &#124; failedAssertions=0 &#124; failedFiles=0<br><br>📂 Running architecture-evidence.test.mjs in process...<br>--- Architecture Evidence Contract Tests ---<br>✅ Architecture evidence contract tests passed<br>✅ architecture-evidence.test.mjs completed.<br>📊 FILE RESULT: architecture-evidence.test.mjs &#124; mode=in-process &#124; assertions=24 &#124; passed=24 &#124; failedAssertions=0 &#124; failedFiles=0<br><br>📂 Running auto-optimize-fidelity<br>...[182593 characters omitted]...<br>ete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/app/profile/profile-storage.js:537:28)<br>    at initProfileSubpageLifecycle (file:///mnt/c/Users/Diete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/app/profile/profile-navigation.js:157:5)<br>    at initProfileBridge (file:///mnt/c/Users/Diete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/app/profile/profile-bridge.js:8:5)<br>    at async Promise.all (index 0)<br>    at async MockDocument.dispatch (file:///mnt/c/Users/Diete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/tests/profile-ui-contract.test.mjs:80:9)<br>    at async runProfileUiContractTests (file:///mnt/c/Users/Diete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/tests/profile-ui-contract.test.mjs:244:9)<br>    at async file:///mnt/c/Users/Diete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/tests/profile-ui-contract.test.mjs:257:9<br>[VALIDATION ERROR] Invalid input fields: [<br>  {<br>    fieldId: 'goGoMultiplier',<br>    message: 'goGoMultiplier muss zwischen 1.0 und 1.5 liegen.'<br>  }<br>] |

#### Work Unit 05 – Slice 04

- Auftrag: Symmetrischer Terminalzustand all_dead
- Scope: `app/simulator/stress-replay-comparison.js`, `app/simulator/stress-replay-contract.js`, `app/simulator/stress-replay-runner.js`, `docs/internal/slice-stress-replay-korrektur-arbeitsplan-04-symmetrischer-terminalzustand-all-dead.md`, `docs/internal/stress-replay-korrekturen-implement-review-02a8cb20.md`, `tests/stress-replay-comparison.test.mjs`, `tests/stress-replay-export.test.mjs`, `tests/stress-replay-renderer.test.mjs`, `tests/stress-replay-runner.test.mjs`

### Ereignis 1: `validation-ba9259054cd4`

- Diff-Fingerprint: `ba9259054cd4264ae20f25c0888c1d1da806be3b94a4a51c99cca500f8c6ce4b`
- Status: `PASS`
- Vollständig: `YES`
- Kurzresultat: 1 passed; 0 failed; 0 unavailable; 1 required
- Ausgabedigest: `14039b38104bb95d8fd171427bc5c3e0e360693f729d7d11b76c58ff84a05e6e`

| Matrixbefehl | Status | Exitcode | Kompaktausgabe |
|---|---|---:|---|
| shell: npm test | PASS | 0 | &gt; ruhestand-app-final@1.0.0 test<br>&gt; node tests/run-tests.mjs<br><br>🚀 Starting Test Runner...<br>Found 180 test files.<br><br>📂 Running 3bucket-config.test.mjs in process...<br>--- 3-Bucket Config Tests ---<br>✅ 3-Bucket config tests passed<br>✅ 3bucket-config.test.mjs completed.<br>📊 FILE RESULT: 3bucket-config.test.mjs &#124; mode=in-process &#124; assertions=17 &#124; passed=17 &#124; failedAssertions=0 &#124; failedFiles=0<br><br>📂 Running 3bucket-refill.test.mjs in process...<br>--- 3-Bucket Refill Tests ---<br>✅ 3-Bucket refill tests passed<br>✅ 3bucket-refill.test.mjs completed.<br>📊 FILE RESULT: 3bucket-refill.test.mjs &#124; mode=in-process &#124; assertions=32 &#124; passed=32 &#124; failedAssertions=0 &#124; failedFiles=0<br><br>📂 Running architecture-evidence.test.mjs in process...<br>--- Architecture Evidence Contract Tests ---<br>✅ Architecture evidence contract tests passed<br>✅ architecture-evidence.test.mjs completed.<br>📊 FILE RESULT: architecture-evidence.test.mjs &#124; mode=in-process &#124; assertions=24 &#124; passed=24 &#124; failedAssertions=0 &#124; failedFiles=0<br><br>📂 Running auto-optimize-fidelity<br>...[182677 characters omitted]...<br>ete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/app/profile/profile-storage.js:537:28)<br>    at initProfileSubpageLifecycle (file:///mnt/c/Users/Diete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/app/profile/profile-navigation.js:157:5)<br>    at initProfileBridge (file:///mnt/c/Users/Diete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/app/profile/profile-bridge.js:8:5)<br>    at async Promise.all (index 0)<br>    at async MockDocument.dispatch (file:///mnt/c/Users/Diete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/tests/profile-ui-contract.test.mjs:80:9)<br>    at async runProfileUiContractTests (file:///mnt/c/Users/Diete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/tests/profile-ui-contract.test.mjs:244:9)<br>    at async file:///mnt/c/Users/Diete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/tests/profile-ui-contract.test.mjs:257:9<br>[VALIDATION ERROR] Invalid input fields: [<br>  {<br>    fieldId: 'goGoMultiplier',<br>    message: 'goGoMultiplier muss zwischen 1.0 und 1.5 liegen.'<br>  }<br>] |

#### Work Unit 06 – Slice 05

- Auftrag: Explizite Missingness bis in Transaktions-Breakdowns
- Scope: `app/simulator/simulator-bond-refill.js`, `app/simulator/simulator-engine-direct.js`, `app/simulator/simulator-forced-sale.js`, `app/simulator/stress-replay-transactions.js`, `docs/internal/slice-stress-replay-korrektur-arbeitsplan-05-explizite-missingness-bis-in-transaktions-breakdowns.md`, `docs/internal/slice-stress-replay-korrektur-arbeitsplan-05-explizite-transaktions-missingness.md`, `docs/internal/stress-replay-korrekturen-implement-review-02a8cb20.md`, `tests/stress-replay-comparison.test.mjs`, `tests/stress-replay-transactions.test.mjs`

### Ereignis 1: `validation-bb6c135049dd`

- Diff-Fingerprint: `bb6c135049dd97fa96be561566bd9179fda487ca5f4214ea007f67332e7dd3d4`
- Status: `PASS`
- Vollständig: `YES`
- Kurzresultat: 1 passed; 0 failed; 0 unavailable; 1 required
- Ausgabedigest: `c50b004b3898f26a060b84becc1b06a6ee4412c29188c22c9ede801d6b9487ad`

| Matrixbefehl | Status | Exitcode | Kompaktausgabe |
|---|---|---:|---|
| shell: npm test | PASS | 0 | &gt; ruhestand-app-final@1.0.0 test<br>&gt; node tests/run-tests.mjs<br><br>🚀 Starting Test Runner...<br>Found 180 test files.<br><br>📂 Running 3bucket-config.test.mjs in process...<br>--- 3-Bucket Config Tests ---<br>✅ 3-Bucket config tests passed<br>✅ 3bucket-config.test.mjs completed.<br>📊 FILE RESULT: 3bucket-config.test.mjs &#124; mode=in-process &#124; assertions=17 &#124; passed=17 &#124; failedAssertions=0 &#124; failedFiles=0<br><br>📂 Running 3bucket-refill.test.mjs in process...<br>--- 3-Bucket Refill Tests ---<br>✅ 3-Bucket refill tests passed<br>✅ 3bucket-refill.test.mjs completed.<br>📊 FILE RESULT: 3bucket-refill.test.mjs &#124; mode=in-process &#124; assertions=32 &#124; passed=32 &#124; failedAssertions=0 &#124; failedFiles=0<br><br>📂 Running architecture-evidence.test.mjs in process...<br>--- Architecture Evidence Contract Tests ---<br>✅ Architecture evidence contract tests passed<br>✅ architecture-evidence.test.mjs completed.<br>📊 FILE RESULT: architecture-evidence.test.mjs &#124; mode=in-process &#124; assertions=24 &#124; passed=24 &#124; failedAssertions=0 &#124; failedFiles=0<br><br>📂 Running auto-optimize-fidelity<br>...[182748 characters omitted]...<br>ete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/app/profile/profile-storage.js:537:28)<br>    at initProfileSubpageLifecycle (file:///mnt/c/Users/Diete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/app/profile/profile-navigation.js:157:5)<br>    at initProfileBridge (file:///mnt/c/Users/Diete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/app/profile/profile-bridge.js:8:5)<br>    at async Promise.all (index 0)<br>    at async MockDocument.dispatch (file:///mnt/c/Users/Diete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/tests/profile-ui-contract.test.mjs:80:9)<br>    at async runProfileUiContractTests (file:///mnt/c/Users/Diete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/tests/profile-ui-contract.test.mjs:244:9)<br>    at async file:///mnt/c/Users/Diete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/tests/profile-ui-contract.test.mjs:257:9<br>[VALIDATION ERROR] Invalid input fields: [<br>  {<br>    fieldId: 'goGoMultiplier',<br>    message: 'goGoMultiplier muss zwischen 1.0 und 1.5 liegen.'<br>  }<br>] |

#### Work Unit 07 – Slice 06

- Auftrag: Runner-Capture-Paritaet im echten Stressverkauf
- Scope: `app/simulator/simulator-engine-direct.js`, `app/simulator/stress-replay-runner.js`, `docs/internal/slice-stress-replay-korrektur-arbeitsplan-06-runner-capture-paritaet-im-echten-stressverkauf.md`, `docs/internal/slice-stress-replay-korrektur-arbeitsplan-06-runner-capture-paritaet-im-stressverkauf.md`, `docs/internal/stress-replay-korrekturen-implement-review-02a8cb20.md`, `tests/stress-replay-runner.test.mjs`, `tests/stress-replay-transactions.test.mjs`

### Ereignis 1: `validation-af5da6215f95`

- Diff-Fingerprint: `af5da6215f95dee08884ea854043c20895c71738688d041cb70edabcea36f0a3`
- Status: `PASS`
- Vollständig: `YES`
- Kurzresultat: 1 passed; 0 failed; 0 unavailable; 1 required
- Ausgabedigest: `ecc4f56d433dfddd22947b7ab047ac2ebc13fffd591942dc2654c2fd60c12e71`

| Matrixbefehl | Status | Exitcode | Kompaktausgabe |
|---|---|---:|---|
| shell: npm test | PASS | 0 | &gt; ruhestand-app-final@1.0.0 test<br>&gt; node tests/run-tests.mjs<br><br>🚀 Starting Test Runner...<br>Found 180 test files.<br><br>📂 Running 3bucket-config.test.mjs in process...<br>--- 3-Bucket Config Tests ---<br>✅ 3-Bucket config tests passed<br>✅ 3bucket-config.test.mjs completed.<br>📊 FILE RESULT: 3bucket-config.test.mjs &#124; mode=in-process &#124; assertions=17 &#124; passed=17 &#124; failedAssertions=0 &#124; failedFiles=0<br><br>📂 Running 3bucket-refill.test.mjs in process...<br>--- 3-Bucket Refill Tests ---<br>✅ 3-Bucket refill tests passed<br>✅ 3bucket-refill.test.mjs completed.<br>📊 FILE RESULT: 3bucket-refill.test.mjs &#124; mode=in-process &#124; assertions=32 &#124; passed=32 &#124; failedAssertions=0 &#124; failedFiles=0<br><br>📂 Running architecture-evidence.test.mjs in process...<br>--- Architecture Evidence Contract Tests ---<br>✅ Architecture evidence contract tests passed<br>✅ architecture-evidence.test.mjs completed.<br>📊 FILE RESULT: architecture-evidence.test.mjs &#124; mode=in-process &#124; assertions=24 &#124; passed=24 &#124; failedAssertions=0 &#124; failedFiles=0<br><br>📂 Running auto-optimize-fidelity<br>...[182833 characters omitted]...<br>ete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/app/profile/profile-storage.js:537:28)<br>    at initProfileSubpageLifecycle (file:///mnt/c/Users/Diete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/app/profile/profile-navigation.js:157:5)<br>    at initProfileBridge (file:///mnt/c/Users/Diete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/app/profile/profile-bridge.js:8:5)<br>    at async Promise.all (index 0)<br>    at async MockDocument.dispatch (file:///mnt/c/Users/Diete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/tests/profile-ui-contract.test.mjs:80:9)<br>    at async runProfileUiContractTests (file:///mnt/c/Users/Diete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/tests/profile-ui-contract.test.mjs:244:9)<br>    at async file:///mnt/c/Users/Diete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/tests/profile-ui-contract.test.mjs:257:9<br>[VALIDATION ERROR] Invalid input fields: [<br>  {<br>    fieldId: 'goGoMultiplier',<br>    message: 'goGoMultiplier muss zwischen 1.0 und 1.5 liegen.'<br>  }<br>] |
<!-- audit:validation-attestation:end -->

### Testfreigabe und Pre-Mortem

<!-- audit:test-approval-premortem:begin -->
#### Work Unit 01 – Planung

- Auftrag: Planung und Review der geordneten Implementierungsslices
- Scope: `README.md`, `app/shared/persistence-facade.js`, `app/simulator/monte-carlo-runner.js`, `app/simulator/simulator-bond-refill.js`, `app/simulator/simulator-engine-direct.js`, `app/simulator/simulator-forced-sale.js`, `app/simulator/stress-replay-comparison.js`, `app/simulator/stress-replay-contract.js`, `app/simulator/stress-replay-export.js`, `app/simulator/stress-replay-path-materializer.js`, `app/simulator/stress-replay-persistence.js`, `app/simulator/stress-replay-renderer.js`, `app/simulator/stress-replay-runner.js`, `app/simulator/stress-replay-transactions.js`, `app/simulator/stress-replay-ui.js`, `docs/internal/slice-stress-replay-korrektur-arbeitsplan-01-browser-harness-und-vollstaendiges-browser-gate.md`, `docs/internal/slice-stress-replay-korrektur-arbeitsplan-01-browser-harness-und-vollstandiges-browser-gate.md`, `docs/internal/slice-stress-replay-korrektur-arbeitsplan-02-varianten-whitelist-mit-belegten-prozentgrenzen.md`, `docs/internal/slice-stress-replay-korrektur-arbeitsplan-02-varianten-whitelist-mit-prozentgrenzen.md`, `docs/internal/slice-stress-replay-korrektur-arbeitsplan-03-kanonischer-marktstatus-vor-post-ruin-shadow.md`, `docs/internal/slice-stress-replay-korrektur-arbeitsplan-04-symmetrischer-terminalzustand-all-dead.md`, `docs/internal/slice-stress-replay-korrektur-arbeitsplan-05-explizite-missingness-bis-in-transaktions-breakdowns.md`, `docs/internal/slice-stress-replay-korrektur-arbeitsplan-05-explizite-transaktions-missingness.md`, `docs/internal/slice-stress-replay-korrektur-arbeitsplan-06-runner-capture-paritaet-im-echten-stressverkauf.md`, `docs/internal/slice-stress-replay-korrektur-arbeitsplan-06-runner-capture-paritaet-im-stressverkauf.md`, `docs/internal/slice-stress-replay-korrektur-arbeitsplan-07-produktiver-transaktionaler-persistenzpfad.md`, `docs/internal/slice-stress-replay-korrektur-arbeitsplan-08-busy-und-parallelitaetsvertrag-der-ui.md`, `docs/internal/slice-stress-replay-korrektur-arbeitsplan-09-unabhaengige-herkunftsidentitaet-bei-reload-und-import.md`, `docs/internal/slice-stress-replay-korrektur-arbeitsplan-09-unabhaengige-herkunftsidentitaet.md`, `docs/internal/slice-stress-replay-korrektur-arbeitsplan-10-eindeutige-kpi-deltadarstellung.md`, `docs/internal/slice-stress-replay-korrektur-arbeitsplan-11-abschlussbereinigung-dokumentationssync-und-gesamtgates.md`, `docs/internal/stress-replay-korrekturen-implement-review-02a8cb20.md`, `docs/reference/SIMULATOR_MODULES_README.md`, `docs/reference/TECHNICAL.md`, `tests/README.md`, `tests/browser-smoke.test.mjs`, `tests/persistence.test.mjs`, `tests/stress-replay-comparison.test.mjs`, `tests/stress-replay-contract.test.mjs`, `tests/stress-replay-e2e.test.mjs`, `tests/stress-replay-export.test.mjs`, `tests/stress-replay-persistence.test.mjs`, `tests/stress-replay-renderer.test.mjs`, `tests/stress-replay-runner.test.mjs`, `tests/stress-replay-transactions.test.mjs`, `tests/stress-replay-ui.test.mjs`, `tests/stress-replay-variant.test.mjs`, `tests/worker-parity.test.mjs`

- Teständerungsfreigabe: nicht erfasst.
- Pre-Mortems: keine erfasst.

#### Work Unit 02 – Slice 01

- Auftrag: Browser-Harness und vollständiges Browser-Gate
- Scope: `docs/internal/slice-stress-replay-korrektur-arbeitsplan-01-browser-harness-und-vollstaendiges-browser-gate.md`, `docs/internal/slice-stress-replay-korrektur-arbeitsplan-01-browser-harness-und-vollstandiges-browser-gate.md`, `docs/internal/stress-replay-korrekturen-implement-review-02a8cb20.md`, `tests/browser-smoke.test.mjs`

- Teständerungsfreigabe: nicht erfasst.
- Pre-Mortems:
  - Ereignis 2: In three months the most likely failure is that a later UI slice (8 busy/concurrency contract or 10 KPI renderer) restructures the variant-editor markup, and because this slice's disabled-state proof was never visibly confirmed against a live browser render in the supplied evidence, a regression that leaves variant fields interactively editable before a Monte-Carlo path exists ships undetected until manual QA or a user report surfaces it.
  - Ereignis 3: In three months, the most likely failure cause is that a later UI refactoring (e.g., in Slice 08 UI concurrency or Slice 10 KPI delta rendering) restructures the variant editor container markup or wraps controls in a separate sub-form/legend without corresponding harness updates, allowing controls to remain interactively editable prior to Monte-Carlo path fixation.

#### Work Unit 03 – Slice 02

- Auftrag: Varianten-Whitelist mit belegten Prozentgrenzen
- Scope: `app/simulator/stress-replay-contract.js`, `docs/internal/slice-stress-replay-korrektur-arbeitsplan-02-varianten-whitelist-mit-belegten-prozentgrenzen.md`, `docs/internal/slice-stress-replay-korrektur-arbeitsplan-02-varianten-whitelist-mit-prozentgrenzen.md`, `docs/internal/stress-replay-korrekturen-implement-review-02a8cb20.md`, `tests/stress-replay-contract.test.mjs`, `tests/stress-replay-export.test.mjs`, `tests/stress-replay-variant.test.mjs`

- Teständerungsfreigabe: nicht erfasst.
- Pre-Mortems:
  - Ereignis 2: In three months, the most likely failure is a support report from a user whose stress-replay workspace was created before this correction with &#96;maxSkimPctOfEq&#96; or &#96;maxBearRefillPctOfEq&#96; outside the new bounds; on reload/import the workspace now hard-fails validation with no migration or clear guidance, and because the asymmetric bear-refill fingerprint-bypass path was never regression-tested, a similarly crafted out-of-range bear-refill import could theoretically slip through if a future refactor accidentally special-cases one field's validation path differently from the other.
  - Ereignis 3: In three months, the most likely failure cause is a deserialization error encountered when importing or restoring a legacy workspace containing percentage values outside [0,50]/[0,70] that were created before explicit bounds enforcement, leading to an unhandled contract rejection in Slice 07/09 persistence/import paths rather than a graceful schema migration.

#### Work Unit 04 – Slice 03

- Auftrag: Kanonischer Marktstatus vor Post-Ruin-Shadow
- Scope: `app/simulator/monte-carlo-runner.js`, `docs/internal/slice-stress-replay-korrektur-arbeitsplan-03-kanonischer-marktstatus-vor-post-ruin-shadow.md`, `docs/internal/stress-replay-korrekturen-implement-review-02a8cb20.md`, `tests/worker-parity.test.mjs`

- Teständerungsfreigabe: nicht erfasst.
- Pre-Mortems:
  - Ereignis 2: In three months, the most likely failure is a maintainer adding a configuration path where ruin no longer unconditionally breaks the main simulation loop while stress-replay capture is active (e.g., for a new post-ruin household-only continuation feature), which would let the now-mutated &#96;simState.marketDataHist&#96; leak into further live engine sampling for captured runs only, silently diverging captured-run financial outcomes from otherwise-identical non-captured runs — a defect the current test suite would not catch because no test exercises &#96;BREAK_ON_RUIN=false&#96; together with active capture, and no test seeds ruin at year index 0.
  - Ereignis 3: In three months, the most likely failure cause is an engine refactoring that introduces configurable post-ruin continuation loops without BREAK_ON_RUIN, causing the ruin-time mutation of simState.marketDataHist to persist into further live simulation steps rather than being restricted to the shadow domain, resulting in an undetected return and CAPE divergence between captured and uncaptured Monte Carlo runs.

#### Work Unit 05 – Slice 04

- Auftrag: Symmetrischer Terminalzustand all_dead
- Scope: `app/simulator/stress-replay-comparison.js`, `app/simulator/stress-replay-contract.js`, `app/simulator/stress-replay-runner.js`, `docs/internal/slice-stress-replay-korrektur-arbeitsplan-04-symmetrischer-terminalzustand-all-dead.md`, `docs/internal/stress-replay-korrekturen-implement-review-02a8cb20.md`, `tests/stress-replay-comparison.test.mjs`, `tests/stress-replay-export.test.mjs`, `tests/stress-replay-renderer.test.mjs`, `tests/stress-replay-runner.test.mjs`

- Teständerungsfreigabe: nicht erfasst.
- Pre-Mortems:
  - Ereignis 2: In three months, the most likely failure is exactly the gap above — a refactor of loop initialization or portfolio-snapshot timing regresses the immediate-first-year-death value computation, and it ships undetected because no runner test seeds death at yearIndex 0 with zero prior financial years; it would only surface as a subtle nominal/real value mismatch reported by end users on very short/adverse scenario paths.
  - Ereignis 3: In three months, the most likely failure cause is a feature addition introducing partial-year estate settlement or inheritance transaction records upon terminal_death, which accidentally marks terminal death rows as partially financially evaluable without updating the strict contract validator invariants (financiallyEvaluable === false, withdrawalEur === null, taxEur === null), causing downstream contract validation failures across existing stress-replay workspaces.

#### Work Unit 06 – Slice 05

- Auftrag: Explizite Missingness bis in Transaktions-Breakdowns
- Scope: `app/simulator/simulator-bond-refill.js`, `app/simulator/simulator-engine-direct.js`, `app/simulator/simulator-forced-sale.js`, `app/simulator/stress-replay-transactions.js`, `docs/internal/slice-stress-replay-korrektur-arbeitsplan-05-explizite-missingness-bis-in-transaktions-breakdowns.md`, `docs/internal/slice-stress-replay-korrektur-arbeitsplan-05-explizite-transaktions-missingness.md`, `docs/internal/stress-replay-korrekturen-implement-review-02a8cb20.md`, `tests/stress-replay-comparison.test.mjs`, `tests/stress-replay-transactions.test.mjs`

- Teständerungsfreigabe: nicht erfasst.
- Pre-Mortems:
  - Ereignis 2: In three months, the most likely failure cause is exactly the residual risk above: a maintainer extends &#96;simulator-forced-sale.js&#96; for a bonds-bucket-aware forced sale/payout fallback and forgets to extend the paired missingness-generation branch, and because no test exercises a 3-bucket forced sale with more than two populated breakdown entries, the gap ships silently reviewed-green until a real 3-bucket production run first hits that code path and throws at runtime (fail-closed, but as an unplanned incident rather than a caught regression).
  - Ereignis 3: In three months, the most likely failure cause would be an engine refactoring that introduces a new transaction source or sale mechanic (e.g. automated cross-tranche rebalancing or cash buffer replenishment) with non-standard field naming (e.g. missing canonical grossEur/brutto properties or emitting string-encoded amounts), triggering runtime type errors in readBreakdownMoney and normalizeBreakdown during transaction ingestion.

#### Work Unit 07 – Slice 06

- Auftrag: Runner-Capture-Paritaet im echten Stressverkauf
- Scope: `app/simulator/simulator-engine-direct.js`, `app/simulator/stress-replay-runner.js`, `docs/internal/slice-stress-replay-korrektur-arbeitsplan-06-runner-capture-paritaet-im-echten-stressverkauf.md`, `docs/internal/slice-stress-replay-korrektur-arbeitsplan-06-runner-capture-paritaet-im-stressverkauf.md`, `docs/internal/stress-replay-korrekturen-implement-review-02a8cb20.md`, `tests/stress-replay-runner.test.mjs`, `tests/stress-replay-transactions.test.mjs`

- Teständerungsfreigabe: nicht erfasst.
- Pre-Mortems:
  - Ereignis 2: In three months, the most likely failure cause is a future maintainer wiring &#96;captureTransactions&#96; from an external boolean-like source (e.g. a UI checkbox value, a JSON config flag serialized as &#96;"true"&#96;/&#96;1&#96;) without knowing the strict &#96;=== true&#96; requirement, causing transaction diagnostics to silently vanish from a replay run with no error — a quiet capability regression rather than a crash, only caught if someone later notices missing diagnostics in output review.
  - Ereignis 3: In three months, the most likely failure cause is an integration layer or batch test script passing a non-boolean truthy config value (e.g. from JSON or CLI options) to &#96;runStressReplayPathV1({ captureTransactions })&#96;, leading to silent deactivation of transaction diagnostics and false negatives in transaction audit reporting while core financial simulation metrics remain fully green.
<!-- audit:test-approval-premortem:end -->

### Findings-Lebenszyklus

<!-- audit:findings:begin -->
#### Work Unit 01 – Planung

- Auftrag: Planung und Review der geordneten Implementierungsslices
- Scope: `README.md`, `app/shared/persistence-facade.js`, `app/simulator/monte-carlo-runner.js`, `app/simulator/simulator-bond-refill.js`, `app/simulator/simulator-engine-direct.js`, `app/simulator/simulator-forced-sale.js`, `app/simulator/stress-replay-comparison.js`, `app/simulator/stress-replay-contract.js`, `app/simulator/stress-replay-export.js`, `app/simulator/stress-replay-path-materializer.js`, `app/simulator/stress-replay-persistence.js`, `app/simulator/stress-replay-renderer.js`, `app/simulator/stress-replay-runner.js`, `app/simulator/stress-replay-transactions.js`, `app/simulator/stress-replay-ui.js`, `docs/internal/slice-stress-replay-korrektur-arbeitsplan-01-browser-harness-und-vollstaendiges-browser-gate.md`, `docs/internal/slice-stress-replay-korrektur-arbeitsplan-01-browser-harness-und-vollstandiges-browser-gate.md`, `docs/internal/slice-stress-replay-korrektur-arbeitsplan-02-varianten-whitelist-mit-belegten-prozentgrenzen.md`, `docs/internal/slice-stress-replay-korrektur-arbeitsplan-02-varianten-whitelist-mit-prozentgrenzen.md`, `docs/internal/slice-stress-replay-korrektur-arbeitsplan-03-kanonischer-marktstatus-vor-post-ruin-shadow.md`, `docs/internal/slice-stress-replay-korrektur-arbeitsplan-04-symmetrischer-terminalzustand-all-dead.md`, `docs/internal/slice-stress-replay-korrektur-arbeitsplan-05-explizite-missingness-bis-in-transaktions-breakdowns.md`, `docs/internal/slice-stress-replay-korrektur-arbeitsplan-05-explizite-transaktions-missingness.md`, `docs/internal/slice-stress-replay-korrektur-arbeitsplan-06-runner-capture-paritaet-im-echten-stressverkauf.md`, `docs/internal/slice-stress-replay-korrektur-arbeitsplan-06-runner-capture-paritaet-im-stressverkauf.md`, `docs/internal/slice-stress-replay-korrektur-arbeitsplan-07-produktiver-transaktionaler-persistenzpfad.md`, `docs/internal/slice-stress-replay-korrektur-arbeitsplan-08-busy-und-parallelitaetsvertrag-der-ui.md`, `docs/internal/slice-stress-replay-korrektur-arbeitsplan-09-unabhaengige-herkunftsidentitaet-bei-reload-und-import.md`, `docs/internal/slice-stress-replay-korrektur-arbeitsplan-09-unabhaengige-herkunftsidentitaet.md`, `docs/internal/slice-stress-replay-korrektur-arbeitsplan-10-eindeutige-kpi-deltadarstellung.md`, `docs/internal/slice-stress-replay-korrektur-arbeitsplan-11-abschlussbereinigung-dokumentationssync-und-gesamtgates.md`, `docs/internal/stress-replay-korrekturen-implement-review-02a8cb20.md`, `docs/reference/SIMULATOR_MODULES_README.md`, `docs/reference/TECHNICAL.md`, `tests/README.md`, `tests/browser-smoke.test.mjs`, `tests/persistence.test.mjs`, `tests/stress-replay-comparison.test.mjs`, `tests/stress-replay-contract.test.mjs`, `tests/stress-replay-e2e.test.mjs`, `tests/stress-replay-export.test.mjs`, `tests/stress-replay-persistence.test.mjs`, `tests/stress-replay-renderer.test.mjs`, `tests/stress-replay-runner.test.mjs`, `tests/stress-replay-transactions.test.mjs`, `tests/stress-replay-ui.test.mjs`, `tests/stress-replay-variant.test.mjs`, `tests/worker-parity.test.mjs`

Noch keine strukturierten Findings.

#### Work Unit 02 – Slice 01

- Auftrag: Browser-Harness und vollständiges Browser-Gate
- Scope: `docs/internal/slice-stress-replay-korrektur-arbeitsplan-01-browser-harness-und-vollstaendiges-browser-gate.md`, `docs/internal/slice-stress-replay-korrektur-arbeitsplan-01-browser-harness-und-vollstandiges-browser-gate.md`, `docs/internal/stress-replay-korrekturen-implement-review-02a8cb20.md`, `tests/browser-smoke.test.mjs`

### `C-01` — `OPEN`

- Quelle: `claude`; Runde 1
- Klasse: `OBSERVATION`
- Finding: For a slice whose entire purpose is "vollständiges Browser-Gate," the bound npm-test excerpt does not visibly show a &#96;browser-smoke.test.mjs&#96; FILE RESULT line proving the edited fieldset-disabled/status assertions ran against a real Chromium session rather than being skipped due to the same missing-binary condition Codex hit locally.
- Akzeptanztest: VALIDATE: ["node","tests/run-tests.mjs","--only","browser-smoke.test.mjs"]
- Statusbegründung: –

#### Work Unit 03 – Slice 02

- Auftrag: Varianten-Whitelist mit belegten Prozentgrenzen
- Scope: `app/simulator/stress-replay-contract.js`, `docs/internal/slice-stress-replay-korrektur-arbeitsplan-02-varianten-whitelist-mit-belegten-prozentgrenzen.md`, `docs/internal/slice-stress-replay-korrektur-arbeitsplan-02-varianten-whitelist-mit-prozentgrenzen.md`, `docs/internal/stress-replay-korrekturen-implement-review-02a8cb20.md`, `tests/stress-replay-contract.test.mjs`, `tests/stress-replay-export.test.mjs`, `tests/stress-replay-variant.test.mjs`

### `C-01` — `OPEN`

- Quelle: `claude`; Runde 1
- Klasse: `OBSERVATION`
- Finding: Percentage-bound fingerprint-bypass regression tests only exercise &#96;maxSkimPctOfEq&#96; (export and variant layers); &#96;maxBearRefillPctOfEq&#96; has no equivalent manipulated-fingerprint test, and no test in this slice demonstrates the load/import behavior for pre-existing workspaces whose stored percentage values now fall outside the newly introduced [0,50]/[0,70] bounds.
- Akzeptanztest: Add a &#96;maxBearRefillPctOfEq&#96; counterpart to the existing manipulated-import/fingerprint-recompute test in tests/stress-replay-export.test.mjs and tests/stress-replay-variant.test.mjs, and add or reference a persistence/import-layer test (in the upcoming Slice 07/09 scope) that asserts a clear, non-silent rejection (not data loss) for a persisted workspace containing an out-of-range legacy percentage value.
- Statusbegründung: –

#### Work Unit 04 – Slice 03

- Auftrag: Kanonischer Marktstatus vor Post-Ruin-Shadow
- Scope: `app/simulator/monte-carlo-runner.js`, `docs/internal/slice-stress-replay-korrektur-arbeitsplan-03-kanonischer-marktstatus-vor-post-ruin-shadow.md`, `docs/internal/stress-replay-korrekturen-implement-review-02a8cb20.md`, `tests/worker-parity.test.mjs`

### `C-01` — `OPEN`

- Quelle: `claude`; Runde 1
- Klasse: `OBSERVATION`
- Finding: The new ruin-transition fixture only covers a non-initial ruin year (&#96;ruinYearIndex &gt; 0&#96; is asserted as a precondition), so the edge case of ruin on the very first simulated year — where &#96;marketDataHist&#96; has minimal/initial prior state — is untested; separately, the diff's safety depends on &#96;BREAK_ON_RUIN&#96; being unconditionally true whenever stress-replay capture seeds &#96;simState.marketDataHist&#96;, which is not visible/provable from this diff alone.
- Akzeptanztest: Add a worker-parity fixture where the sampled ruin year is index 0 (first simulated year) and assert the first/second post-ruin shadow years still resolve a stable, correctly-seeded CAPE/return from that terminal ruin year; additionally add or reference an assertion/comment at the &#96;BREAK_ON_RUIN&#96; definition confirming it is unconditionally true for any run where &#96;stressReplayCapture&#96; is requested, so capture-vs-no-capture financial parity cannot regress via this code path.
- Statusbegründung: –

#### Work Unit 05 – Slice 04

- Auftrag: Symmetrischer Terminalzustand all_dead
- Scope: `app/simulator/stress-replay-comparison.js`, `app/simulator/stress-replay-contract.js`, `app/simulator/stress-replay-runner.js`, `docs/internal/slice-stress-replay-korrektur-arbeitsplan-04-symmetrischer-terminalzustand-all-dead.md`, `docs/internal/stress-replay-korrekturen-implement-review-02a8cb20.md`, `tests/stress-replay-comparison.test.mjs`, `tests/stress-replay-export.test.mjs`, `tests/stress-replay-renderer.test.mjs`, `tests/stress-replay-runner.test.mjs`

### `C-02` — `OPEN`

- Quelle: `claude`; Runde 1
- Klasse: `OBSERVATION`
- Finding: The runner-level all_dead fixture no longer covers death occurring on the very first simulated year (yearIndex 0, no preceding financial_year row); coverage shifted to death-after-one-financial-year, leaving the initial-state portfolio/inflation computation for an immediate first-year death unverified end-to-end, only contract-schema-validated in isolation.
- Akzeptanztest: Add a runner test with pathFor([deathRecord], 'all_dead') where deathRecord = year(0, {recordType:'terminal_death', financiallyEvaluable:false, householdEvents: household({p1Alive:0})}) and assert yearResults.length===1, yearResults[0].status==='terminal_death', nominalValueEur/realValueEur equal the pre-loop initial portfolio value, and summary.financiallyEvaluatedYears===0.
- Statusbegründung: –

#### Work Unit 06 – Slice 05

- Auftrag: Explizite Missingness bis in Transaktions-Breakdowns
- Scope: `app/simulator/simulator-bond-refill.js`, `app/simulator/simulator-engine-direct.js`, `app/simulator/simulator-forced-sale.js`, `app/simulator/stress-replay-transactions.js`, `docs/internal/slice-stress-replay-korrektur-arbeitsplan-05-explizite-missingness-bis-in-transaktions-breakdowns.md`, `docs/internal/slice-stress-replay-korrektur-arbeitsplan-05-explizite-transaktions-missingness.md`, `docs/internal/stress-replay-korrekturen-implement-review-02a8cb20.md`, `tests/stress-replay-comparison.test.mjs`, `tests/stress-replay-transactions.test.mjs`

Noch keine strukturierten Findings.

#### Work Unit 07 – Slice 06

- Auftrag: Runner-Capture-Paritaet im echten Stressverkauf
- Scope: `app/simulator/simulator-engine-direct.js`, `app/simulator/stress-replay-runner.js`, `docs/internal/slice-stress-replay-korrektur-arbeitsplan-06-runner-capture-paritaet-im-echten-stressverkauf.md`, `docs/internal/slice-stress-replay-korrektur-arbeitsplan-06-runner-capture-paritaet-im-stressverkauf.md`, `docs/internal/stress-replay-korrekturen-implement-review-02a8cb20.md`, `tests/stress-replay-runner.test.mjs`, `tests/stress-replay-transactions.test.mjs`

### `C-01` — `OPEN`

- Quelle: `claude`; Runde 1
- Klasse: `OBSERVATION`
- Finding: The new &#96;captureTransactions&#96; parameter is compared with strict &#96;=== true&#96;, so any future caller passing a truthy-but-non-boolean value (e.g. &#96;1&#96;, &#96;"true"&#96;) silently disables transaction capture instead of erroring or coercing — no test exercises this non-boolean-truthy path today.
- Akzeptanztest: Add a unit test in tests/stress-replay-runner.test.mjs asserting that &#96;runStressReplayPathV1({..., captureTransactions: 1, ...})&#96; yields &#96;transactions.length === 0&#96;, so the strict-boolean contract is explicit and regression-proof rather than incidental.
- Statusbegründung: –
<!-- audit:findings:end -->

### Entscheidungstabelle

<!-- audit:decision-table:begin -->
#### Work Unit 01 – Planung

- Auftrag: Planung und Review der geordneten Implementierungsslices
- Scope: `README.md`, `app/shared/persistence-facade.js`, `app/simulator/monte-carlo-runner.js`, `app/simulator/simulator-bond-refill.js`, `app/simulator/simulator-engine-direct.js`, `app/simulator/simulator-forced-sale.js`, `app/simulator/stress-replay-comparison.js`, `app/simulator/stress-replay-contract.js`, `app/simulator/stress-replay-export.js`, `app/simulator/stress-replay-path-materializer.js`, `app/simulator/stress-replay-persistence.js`, `app/simulator/stress-replay-renderer.js`, `app/simulator/stress-replay-runner.js`, `app/simulator/stress-replay-transactions.js`, `app/simulator/stress-replay-ui.js`, `docs/internal/slice-stress-replay-korrektur-arbeitsplan-01-browser-harness-und-vollstaendiges-browser-gate.md`, `docs/internal/slice-stress-replay-korrektur-arbeitsplan-01-browser-harness-und-vollstandiges-browser-gate.md`, `docs/internal/slice-stress-replay-korrektur-arbeitsplan-02-varianten-whitelist-mit-belegten-prozentgrenzen.md`, `docs/internal/slice-stress-replay-korrektur-arbeitsplan-02-varianten-whitelist-mit-prozentgrenzen.md`, `docs/internal/slice-stress-replay-korrektur-arbeitsplan-03-kanonischer-marktstatus-vor-post-ruin-shadow.md`, `docs/internal/slice-stress-replay-korrektur-arbeitsplan-04-symmetrischer-terminalzustand-all-dead.md`, `docs/internal/slice-stress-replay-korrektur-arbeitsplan-05-explizite-missingness-bis-in-transaktions-breakdowns.md`, `docs/internal/slice-stress-replay-korrektur-arbeitsplan-05-explizite-transaktions-missingness.md`, `docs/internal/slice-stress-replay-korrektur-arbeitsplan-06-runner-capture-paritaet-im-echten-stressverkauf.md`, `docs/internal/slice-stress-replay-korrektur-arbeitsplan-06-runner-capture-paritaet-im-stressverkauf.md`, `docs/internal/slice-stress-replay-korrektur-arbeitsplan-07-produktiver-transaktionaler-persistenzpfad.md`, `docs/internal/slice-stress-replay-korrektur-arbeitsplan-08-busy-und-parallelitaetsvertrag-der-ui.md`, `docs/internal/slice-stress-replay-korrektur-arbeitsplan-09-unabhaengige-herkunftsidentitaet-bei-reload-und-import.md`, `docs/internal/slice-stress-replay-korrektur-arbeitsplan-09-unabhaengige-herkunftsidentitaet.md`, `docs/internal/slice-stress-replay-korrektur-arbeitsplan-10-eindeutige-kpi-deltadarstellung.md`, `docs/internal/slice-stress-replay-korrektur-arbeitsplan-11-abschlussbereinigung-dokumentationssync-und-gesamtgates.md`, `docs/internal/stress-replay-korrekturen-implement-review-02a8cb20.md`, `docs/reference/SIMULATOR_MODULES_README.md`, `docs/reference/TECHNICAL.md`, `tests/README.md`, `tests/browser-smoke.test.mjs`, `tests/persistence.test.mjs`, `tests/stress-replay-comparison.test.mjs`, `tests/stress-replay-contract.test.mjs`, `tests/stress-replay-e2e.test.mjs`, `tests/stress-replay-export.test.mjs`, `tests/stress-replay-persistence.test.mjs`, `tests/stress-replay-renderer.test.mjs`, `tests/stress-replay-runner.test.mjs`, `tests/stress-replay-transactions.test.mjs`, `tests/stress-replay-ui.test.mjs`, `tests/stress-replay-variant.test.mjs`, `tests/worker-parity.test.mjs`

| ID | Quelle | Finding | Klasse | Entscheidung | Umsetzung |
|---|---|---|---|---|---|
| – | – | Noch keine Findings | – | – | – |

#### Work Unit 02 – Slice 01

- Auftrag: Browser-Harness und vollständiges Browser-Gate
- Scope: `docs/internal/slice-stress-replay-korrektur-arbeitsplan-01-browser-harness-und-vollstaendiges-browser-gate.md`, `docs/internal/slice-stress-replay-korrektur-arbeitsplan-01-browser-harness-und-vollstandiges-browser-gate.md`, `docs/internal/stress-replay-korrekturen-implement-review-02a8cb20.md`, `tests/browser-smoke.test.mjs`

| ID | Quelle | Finding | Klasse | Entscheidung | Umsetzung |
|---|---|---|---|---|---|
| C-01 | claude | For a slice whose entire purpose is "vollständiges Browser-Gate," the bound npm-test excerpt does not visibly show a &#96;browser-smoke.test.mjs&#96; FILE RESULT line proving the edited fieldset-disabled/status assertions ran against a real Chromium session rather than being skipped due to the same missing-binary condition Codex hit locally. | OBSERVATION | offen | offen |

#### Work Unit 03 – Slice 02

- Auftrag: Varianten-Whitelist mit belegten Prozentgrenzen
- Scope: `app/simulator/stress-replay-contract.js`, `docs/internal/slice-stress-replay-korrektur-arbeitsplan-02-varianten-whitelist-mit-belegten-prozentgrenzen.md`, `docs/internal/slice-stress-replay-korrektur-arbeitsplan-02-varianten-whitelist-mit-prozentgrenzen.md`, `docs/internal/stress-replay-korrekturen-implement-review-02a8cb20.md`, `tests/stress-replay-contract.test.mjs`, `tests/stress-replay-export.test.mjs`, `tests/stress-replay-variant.test.mjs`

| ID | Quelle | Finding | Klasse | Entscheidung | Umsetzung |
|---|---|---|---|---|---|
| C-01 | claude | Percentage-bound fingerprint-bypass regression tests only exercise &#96;maxSkimPctOfEq&#96; (export and variant layers); &#96;maxBearRefillPctOfEq&#96; has no equivalent manipulated-fingerprint test, and no test in this slice demonstrates the load/import behavior for pre-existing workspaces whose stored percentage values now fall outside the newly introduced [0,50]/[0,70] bounds. | OBSERVATION | offen | offen |

#### Work Unit 04 – Slice 03

- Auftrag: Kanonischer Marktstatus vor Post-Ruin-Shadow
- Scope: `app/simulator/monte-carlo-runner.js`, `docs/internal/slice-stress-replay-korrektur-arbeitsplan-03-kanonischer-marktstatus-vor-post-ruin-shadow.md`, `docs/internal/stress-replay-korrekturen-implement-review-02a8cb20.md`, `tests/worker-parity.test.mjs`

| ID | Quelle | Finding | Klasse | Entscheidung | Umsetzung |
|---|---|---|---|---|---|
| C-01 | claude | The new ruin-transition fixture only covers a non-initial ruin year (&#96;ruinYearIndex &gt; 0&#96; is asserted as a precondition), so the edge case of ruin on the very first simulated year — where &#96;marketDataHist&#96; has minimal/initial prior state — is untested; separately, the diff's safety depends on &#96;BREAK_ON_RUIN&#96; being unconditionally true whenever stress-replay capture seeds &#96;simState.marketDataHist&#96;, which is not visible/provable from this diff alone. | OBSERVATION | offen | offen |

#### Work Unit 05 – Slice 04

- Auftrag: Symmetrischer Terminalzustand all_dead
- Scope: `app/simulator/stress-replay-comparison.js`, `app/simulator/stress-replay-contract.js`, `app/simulator/stress-replay-runner.js`, `docs/internal/slice-stress-replay-korrektur-arbeitsplan-04-symmetrischer-terminalzustand-all-dead.md`, `docs/internal/stress-replay-korrekturen-implement-review-02a8cb20.md`, `tests/stress-replay-comparison.test.mjs`, `tests/stress-replay-export.test.mjs`, `tests/stress-replay-renderer.test.mjs`, `tests/stress-replay-runner.test.mjs`

| ID | Quelle | Finding | Klasse | Entscheidung | Umsetzung |
|---|---|---|---|---|---|
| C-02 | claude | The runner-level all_dead fixture no longer covers death occurring on the very first simulated year (yearIndex 0, no preceding financial_year row); coverage shifted to death-after-one-financial-year, leaving the initial-state portfolio/inflation computation for an immediate first-year death unverified end-to-end, only contract-schema-validated in isolation. | OBSERVATION | offen | offen |

#### Work Unit 06 – Slice 05

- Auftrag: Explizite Missingness bis in Transaktions-Breakdowns
- Scope: `app/simulator/simulator-bond-refill.js`, `app/simulator/simulator-engine-direct.js`, `app/simulator/simulator-forced-sale.js`, `app/simulator/stress-replay-transactions.js`, `docs/internal/slice-stress-replay-korrektur-arbeitsplan-05-explizite-missingness-bis-in-transaktions-breakdowns.md`, `docs/internal/slice-stress-replay-korrektur-arbeitsplan-05-explizite-transaktions-missingness.md`, `docs/internal/stress-replay-korrekturen-implement-review-02a8cb20.md`, `tests/stress-replay-comparison.test.mjs`, `tests/stress-replay-transactions.test.mjs`

| ID | Quelle | Finding | Klasse | Entscheidung | Umsetzung |
|---|---|---|---|---|---|
| – | – | Noch keine Findings | – | – | – |

#### Work Unit 07 – Slice 06

- Auftrag: Runner-Capture-Paritaet im echten Stressverkauf
- Scope: `app/simulator/simulator-engine-direct.js`, `app/simulator/stress-replay-runner.js`, `docs/internal/slice-stress-replay-korrektur-arbeitsplan-06-runner-capture-paritaet-im-echten-stressverkauf.md`, `docs/internal/slice-stress-replay-korrektur-arbeitsplan-06-runner-capture-paritaet-im-stressverkauf.md`, `docs/internal/stress-replay-korrekturen-implement-review-02a8cb20.md`, `tests/stress-replay-runner.test.mjs`, `tests/stress-replay-transactions.test.mjs`

| ID | Quelle | Finding | Klasse | Entscheidung | Umsetzung |
|---|---|---|---|---|---|
| C-01 | claude | The new &#96;captureTransactions&#96; parameter is compared with strict &#96;=== true&#96;, so any future caller passing a truthy-but-non-boolean value (e.g. &#96;1&#96;, &#96;"true"&#96;) silently disables transaction capture instead of erroring or coercing — no test exercises this non-boolean-truthy path today. | OBSERVATION | offen | offen |
<!-- audit:decision-table:end -->

### Freigabestatus

<!-- audit:approval-status:begin -->
#### Work Unit 01 – Planung

- Auftrag: Planung und Review der geordneten Implementierungsslices
- Scope: `README.md`, `app/shared/persistence-facade.js`, `app/simulator/monte-carlo-runner.js`, `app/simulator/simulator-bond-refill.js`, `app/simulator/simulator-engine-direct.js`, `app/simulator/simulator-forced-sale.js`, `app/simulator/stress-replay-comparison.js`, `app/simulator/stress-replay-contract.js`, `app/simulator/stress-replay-export.js`, `app/simulator/stress-replay-path-materializer.js`, `app/simulator/stress-replay-persistence.js`, `app/simulator/stress-replay-renderer.js`, `app/simulator/stress-replay-runner.js`, `app/simulator/stress-replay-transactions.js`, `app/simulator/stress-replay-ui.js`, `docs/internal/slice-stress-replay-korrektur-arbeitsplan-01-browser-harness-und-vollstaendiges-browser-gate.md`, `docs/internal/slice-stress-replay-korrektur-arbeitsplan-01-browser-harness-und-vollstandiges-browser-gate.md`, `docs/internal/slice-stress-replay-korrektur-arbeitsplan-02-varianten-whitelist-mit-belegten-prozentgrenzen.md`, `docs/internal/slice-stress-replay-korrektur-arbeitsplan-02-varianten-whitelist-mit-prozentgrenzen.md`, `docs/internal/slice-stress-replay-korrektur-arbeitsplan-03-kanonischer-marktstatus-vor-post-ruin-shadow.md`, `docs/internal/slice-stress-replay-korrektur-arbeitsplan-04-symmetrischer-terminalzustand-all-dead.md`, `docs/internal/slice-stress-replay-korrektur-arbeitsplan-05-explizite-missingness-bis-in-transaktions-breakdowns.md`, `docs/internal/slice-stress-replay-korrektur-arbeitsplan-05-explizite-transaktions-missingness.md`, `docs/internal/slice-stress-replay-korrektur-arbeitsplan-06-runner-capture-paritaet-im-echten-stressverkauf.md`, `docs/internal/slice-stress-replay-korrektur-arbeitsplan-06-runner-capture-paritaet-im-stressverkauf.md`, `docs/internal/slice-stress-replay-korrektur-arbeitsplan-07-produktiver-transaktionaler-persistenzpfad.md`, `docs/internal/slice-stress-replay-korrektur-arbeitsplan-08-busy-und-parallelitaetsvertrag-der-ui.md`, `docs/internal/slice-stress-replay-korrektur-arbeitsplan-09-unabhaengige-herkunftsidentitaet-bei-reload-und-import.md`, `docs/internal/slice-stress-replay-korrektur-arbeitsplan-09-unabhaengige-herkunftsidentitaet.md`, `docs/internal/slice-stress-replay-korrektur-arbeitsplan-10-eindeutige-kpi-deltadarstellung.md`, `docs/internal/slice-stress-replay-korrektur-arbeitsplan-11-abschlussbereinigung-dokumentationssync-und-gesamtgates.md`, `docs/internal/stress-replay-korrekturen-implement-review-02a8cb20.md`, `docs/reference/SIMULATOR_MODULES_README.md`, `docs/reference/TECHNICAL.md`, `tests/README.md`, `tests/browser-smoke.test.mjs`, `tests/persistence.test.mjs`, `tests/stress-replay-comparison.test.mjs`, `tests/stress-replay-contract.test.mjs`, `tests/stress-replay-e2e.test.mjs`, `tests/stress-replay-export.test.mjs`, `tests/stress-replay-persistence.test.mjs`, `tests/stress-replay-renderer.test.mjs`, `tests/stress-replay-runner.test.mjs`, `tests/stress-replay-transactions.test.mjs`, `tests/stress-replay-ui.test.mjs`, `tests/stress-replay-variant.test.mjs`, `tests/worker-parity.test.mjs`

- Implementierung bereit: `NOT_RECORDED`
- Validierung: `NOT_RECORDED`
- Claude-Freigabe: `NOT_RECORDED`
- Antigravity-Freigabe: `NOT_RECORDED`
- Red-State-Folgeslice: `NONE`
- Commit autorisiert: `NO`

#### Work Unit 02 – Slice 01

- Auftrag: Browser-Harness und vollständiges Browser-Gate
- Scope: `docs/internal/slice-stress-replay-korrektur-arbeitsplan-01-browser-harness-und-vollstaendiges-browser-gate.md`, `docs/internal/slice-stress-replay-korrektur-arbeitsplan-01-browser-harness-und-vollstandiges-browser-gate.md`, `docs/internal/stress-replay-korrekturen-implement-review-02a8cb20.md`, `tests/browser-smoke.test.mjs`

- Implementierung bereit: `YES`
- Validierung: `PASS`
- Claude-Freigabe: `YES`
- Antigravity-Freigabe: `YES`
- Red-State-Folgeslice: `NONE`
- Commit autorisiert: `YES`

#### Work Unit 03 – Slice 02

- Auftrag: Varianten-Whitelist mit belegten Prozentgrenzen
- Scope: `app/simulator/stress-replay-contract.js`, `docs/internal/slice-stress-replay-korrektur-arbeitsplan-02-varianten-whitelist-mit-belegten-prozentgrenzen.md`, `docs/internal/slice-stress-replay-korrektur-arbeitsplan-02-varianten-whitelist-mit-prozentgrenzen.md`, `docs/internal/stress-replay-korrekturen-implement-review-02a8cb20.md`, `tests/stress-replay-contract.test.mjs`, `tests/stress-replay-export.test.mjs`, `tests/stress-replay-variant.test.mjs`

- Implementierung bereit: `YES`
- Validierung: `PASS`
- Claude-Freigabe: `YES`
- Antigravity-Freigabe: `YES`
- Red-State-Folgeslice: `NONE`
- Commit autorisiert: `YES`

#### Work Unit 04 – Slice 03

- Auftrag: Kanonischer Marktstatus vor Post-Ruin-Shadow
- Scope: `app/simulator/monte-carlo-runner.js`, `docs/internal/slice-stress-replay-korrektur-arbeitsplan-03-kanonischer-marktstatus-vor-post-ruin-shadow.md`, `docs/internal/stress-replay-korrekturen-implement-review-02a8cb20.md`, `tests/worker-parity.test.mjs`

- Implementierung bereit: `YES`
- Validierung: `PASS`
- Claude-Freigabe: `YES`
- Antigravity-Freigabe: `YES`
- Red-State-Folgeslice: `NONE`
- Commit autorisiert: `YES`

#### Work Unit 05 – Slice 04

- Auftrag: Symmetrischer Terminalzustand all_dead
- Scope: `app/simulator/stress-replay-comparison.js`, `app/simulator/stress-replay-contract.js`, `app/simulator/stress-replay-runner.js`, `docs/internal/slice-stress-replay-korrektur-arbeitsplan-04-symmetrischer-terminalzustand-all-dead.md`, `docs/internal/stress-replay-korrekturen-implement-review-02a8cb20.md`, `tests/stress-replay-comparison.test.mjs`, `tests/stress-replay-export.test.mjs`, `tests/stress-replay-renderer.test.mjs`, `tests/stress-replay-runner.test.mjs`

- Implementierung bereit: `YES`
- Validierung: `PASS`
- Claude-Freigabe: `YES`
- Antigravity-Freigabe: `YES`
- Red-State-Folgeslice: `NONE`
- Commit autorisiert: `YES`

#### Work Unit 06 – Slice 05

- Auftrag: Explizite Missingness bis in Transaktions-Breakdowns
- Scope: `app/simulator/simulator-bond-refill.js`, `app/simulator/simulator-engine-direct.js`, `app/simulator/simulator-forced-sale.js`, `app/simulator/stress-replay-transactions.js`, `docs/internal/slice-stress-replay-korrektur-arbeitsplan-05-explizite-missingness-bis-in-transaktions-breakdowns.md`, `docs/internal/slice-stress-replay-korrektur-arbeitsplan-05-explizite-transaktions-missingness.md`, `docs/internal/stress-replay-korrekturen-implement-review-02a8cb20.md`, `tests/stress-replay-comparison.test.mjs`, `tests/stress-replay-transactions.test.mjs`

- Implementierung bereit: `YES`
- Validierung: `PASS`
- Claude-Freigabe: `YES`
- Antigravity-Freigabe: `YES`
- Red-State-Folgeslice: `NONE`
- Commit autorisiert: `YES`

#### Work Unit 07 – Slice 06

- Auftrag: Runner-Capture-Paritaet im echten Stressverkauf
- Scope: `app/simulator/simulator-engine-direct.js`, `app/simulator/stress-replay-runner.js`, `docs/internal/slice-stress-replay-korrektur-arbeitsplan-06-runner-capture-paritaet-im-echten-stressverkauf.md`, `docs/internal/slice-stress-replay-korrektur-arbeitsplan-06-runner-capture-paritaet-im-stressverkauf.md`, `docs/internal/stress-replay-korrekturen-implement-review-02a8cb20.md`, `tests/stress-replay-runner.test.mjs`, `tests/stress-replay-transactions.test.mjs`

- Implementierung bereit: `YES`
- Validierung: `PASS`
- Claude-Freigabe: `YES`
- Antigravity-Freigabe: `YES`
- Red-State-Folgeslice: `NONE`
- Commit autorisiert: `YES`
<!-- audit:approval-status:end -->
