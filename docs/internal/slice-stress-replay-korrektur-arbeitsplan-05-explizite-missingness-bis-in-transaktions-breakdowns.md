# Slice 05 – Explizite Missingness bis in Transaktions-Breakdowns

**Feature-Branch:** `codex/stress-pfad-replay`
**GitHub-Status:** nur lokal

## Ziel des Slice

Explizite Missingness bis in Transaktions-Breakdowns

## Akzeptanzkriterien

Siehe freigegebenen Arbeitsplan.

## Scope und Nicht-Scope

Erlaubter Scope: `app/simulator/simulator-bond-refill.js`, `app/simulator/simulator-engine-direct.js`, `app/simulator/simulator-forced-sale.js`, `app/simulator/stress-replay-transactions.js`, `docs/internal/slice-stress-replay-korrektur-arbeitsplan-05-explizite-missingness-bis-in-transaktions-breakdowns.md`, `docs/internal/slice-stress-replay-korrektur-arbeitsplan-05-explizite-transaktions-missingness.md`, `docs/internal/stress-replay-korrekturen-implement-review-02a8cb20.md`, `tests/stress-replay-comparison.test.mjs`, `tests/stress-replay-transactions.test.mjs`

## Diff-Risiko inklusive Branch- und Statuscheck

- Branch vor Umsetzung geprüft: `codex/stress-pfad-replay` entspricht dem
  persistierten Zielbranch.
- Vorbestehende Orchestrator-Änderung:
  `docs/internal/stress-replay-korrekturen-implement-review-02a8cb20.md`.
  Sie wurde nicht durch Codex bearbeitet.
- Produktive Änderungsgruppen: vier und damit innerhalb der freigegebenen
  Slice-Grenze.
- Diff-Risiko: Die strengere Validierung kann alte oder manipulierte
  Diagnoseevents mit stillen Breakdown-Nullwerten nun bewusst fail-closed
  abweisen. Finanzpfad, Steuerberechnung und Transaktionsreihenfolge bleiben
  unverändert.

## Geplante Tests

Gemäß Arbeitsplan und Orchestrator-Validierungsmatrix.

## Durchgeführte Änderungen

- Der Transaktionsvertrag unterscheidet Ereignis- und Breakdown-Missingness.
  Breakdown-Gründe binden `breakdownIndex`, `assetClass`, `field` und einen
  nichtleeren stabilen Grund.
- Stille Nullwerte, unbekannte Felder, ungültige Scopes, Duplikate, negative
  beziehungsweise nichtendliche Werte sowie Widersprüche zwischen Breakdown
  und Aggregat werden abgewiesen.
- Forced Sale und Payout-Fallback kennzeichnen fachlich nicht aufteilbare
  Werte explizit. Bond-Refill und reguläre Engine-Verkäufe bewahren belegte
  numerische Breakdown-Werte und begründen nur tatsächlich fehlende Felder.
- Die Vergleichsaggregation transportiert Breakdown-Gründe mitsamt
  Transaktions- und Assetbezug weiter, ohne unbekannt als null Euro oder
  Gleichheit zu behandeln.
- Regressionstests decken Producer, Projektion, Aggregation und negative
  Contractpfade ab.

## Ausgeführte Validierung mit Ergebnis

Fokussierte Entwicklerläufe (keine Orchestrator-Attestierung):

- `node tests/run-single.mjs tests/stress-replay-transactions.test.mjs`:
  46/46 Assertions bestanden.
- `node tests/run-single.mjs tests/stress-replay-comparison.test.mjs`:
  35/35 Assertions bestanden.
- `node tests/run-single.mjs tests/3bucket-refill.test.mjs`:
  32/32 Assertions bestanden.
- `node tests/run-single.mjs tests/simulator-tax-settlement.test.mjs`:
  77/77 Assertions bestanden.
- `node tests/run-single.mjs tests/stress-replay-runner.test.mjs`:
  30/30 Assertions bestanden.
- `node tests/run-single.mjs tests/stress-replay-export.test.mjs`:
  15/15 Assertions bestanden.
- `git diff --check`: bestanden.

Die autoritative Validierungsmatrix und ihre Attestierung bleiben beim
Orchestrator.

## Abweichungen vom Plan

Keine erfasst.

## Offene Risiken

- Größtes Restrisiko ist ein zukünftiger Producer, der fachlich bekannte
  Netto-/Steuerwerte nicht in seine Breakdown-Quelle übernimmt und dadurch
  zulässige, aber weniger präzise Missingness erzeugt.
- Eine numerische Pro-rata-Aufteilung der beobachteten Forced-Sale-Aggregate
  wurde bewusst nicht erfunden; deren Asset-Breakdowns bleiben mit stabilen
  Gründen unbekannt.

## Review-Feedback von Claude

<!-- audit:claude-review:begin -->
### Ereignis 2: Runde 1

- Reviewer: `claude`
- Freigabe: `YES`
- Validierungsbindung: `validation-bb6c135049dd`
- Testdateien: `tests/stress-replay-comparison.test.mjs`, `tests/stress-replay-transactions.test.mjs`
- Prüfdimensionen: Checked (1) event-vs-breakdown missingness scope discrimination, duplicate detection, and contradiction rejection in the rewritten &#96;normalizeMissingness&#96;/&#96;assertBreakdownReconciles&#96; in &#96;stress-replay-transactions.js&#96;; (2) the reconciliation invariant — when any breakdown value for a field is null, only &#96;knownSum &lt;= aggregate (+ tolerance)&#96; is enforced (correctly permitting unknown residuals), and when all breakdown values are known, exact equality within a relative epsilon is enforced; applied both at projection (&#96;buildStressReplayTransactionsForYear&#96;) and independently re-validated at aggregation (&#96;summarizeStressReplayTransactionsV1&#96;), giving tamper/replay resistance against corrupted persisted events; (3) producer correctness in &#96;simulator-bond-refill.js&#96;, &#96;simulator-engine-direct.js&#96;, &#96;simulator-forced-sale.js&#96; — null-guarded &#96;netEur&#96;/&#96;taxEur&#96; breakdown items are 1:1 paired with matching missingness reasons; the forced-sale eq/gold &#96;breakdownIndex&#96; shift (&#96;forcedExecutedEq&gt;0 ? 1 : 0&#96;) and the payout-fallback dual event+breakdown missingness entries are self-checking, because the contract layer independently cross-validates &#96;assetClass&#96;/&#96;field&#96;/&#96;breakdownIndex&#96; against the actual breakdown entry and fails closed on any mismatch rather than silently mis-tagging; (4) negative-path coverage in &#96;tests/stress-replay-transactions.test.mjs&#96; Test 4/4b exercises silent-null, negative, non-finite, aggregate-contradiction, empty-reason, unknown-field, unallocatable-forced-sale, and fully-known bond-refill cases; (5) &#96;tests/stress-replay-comparison.test.mjs&#96; confirms breakdown-scope reasons (not just event-scope) survive aggregation without being conflated with zero or with unrelated event reasons — the added &#96;scope !== 'breakdown'&#96; filter in &#96;normalizeOptionalMoney&#96;'s reason lookup is a real correctness fix versus prior code, which could otherwise have picked a breakdown-scoped reason string to justify an event-level null. No functional regression found in the supplied diff; the stricter &#96;typeof value !== 'number'&#96; checks and mandatory non-null &#96;grossEur&#96; on breakdown entries are intentional tightenings consistent with the "fail closed on silent nulls" goal and are exercised by the new tests.
- Größtes Restrisiko: Largest residual risk: the forced-sale eq/gold breakdown-index-to-assetClass mapping is hand-coded per branch condition rather than derived structurally from the breakdown array itself. It is safe today only because the contract layer's cross-validation (&#96;assetClass !== breakdownEntry.assetClass&#96;, etc.) throws on any future mismatch instead of silently mis-tagging — a correctness guard, but not a substitute for direct test coverage of a widened breakdown shape.
- Realistische Bruchbedingung: Break condition: a future producer change adds a third (e.g. bonds) bucket to the forced-sale or payout-fallback breakdown array in 3-bucket mode without adding the matching missingness branch/index arithmetic. &#96;buildStressReplayTransactionsForYear&#96; would then throw "Missing breakdown N.field requires explicit missingness" or an assetClass-mismatch TypeError at runtime for that new bucket — a fail-closed outcome — but only if some test path actually exercises a 3-bucket forced sale with a populated third breakdown bucket; no such test exists in the current scope, so the gap could persist undetected in review while remaining safely fail-closed in production.
- Eigene Findings: keine
<!-- audit:claude-review:end -->

## Review-Feedback von Antigravity

<!-- audit:antigravity-review:begin -->
### Ereignis 3: Runde 1

- Reviewer: `antigravity`
- Freigabe: `YES`
- Validierungsbindung: `validation-bb6c135049dd`
- Testdateien: `tests/stress-replay-comparison.test.mjs`, `tests/stress-replay-transactions.test.mjs`
- Prüfdimensionen: Scope compliance across all 8 allowlisted files (app/simulator/simulator-bond-refill.js, app/simulator/simulator-engine-direct.js, app/simulator/simulator-forced-sale.js, app/simulator/stress-replay-transactions.js, docs/internal/slice-stress-replay-korrektur-arbeitsplan-05-explizite-missingness-bis-in-transaktions-breakdowns.md, docs/internal/stress-replay-korrekturen-implement-review-02a8cb20.md, tests/stress-replay-comparison.test.mjs, tests/stress-replay-transactions.test.mjs); event-vs-breakdown missingness scoping and discrimination in normalizeMissingness, normalizeOptionalMoney, and assertBreakdownReconciles; strict type verification (typeof value === 'number', finite, non-negative) eliminating previous silent null-to-zero coercions; aggregate-to-breakdown reconciliation invariants under complete and partial missingness; producer correctness across forced sales, payout fallback, bond refills, and regular engine sales; aggregation preservation of breakdown missingness metadata in summarizeStressReplayTransactionsV1; comprehensive adversarial negative-path and regression test coverage
- Größtes Restrisiko: Index-to-asset-class mapping in simulator-forced-sale.js relies on branch-specific manual index arithmetic (forcedExecutedEq &gt; 0 ? 1 : 0) rather than structural derivation from the breakdown array, relying on the contract layer's strict runtime cross-validation (assetClass !== breakdownEntry.assetClass) to fail closed on any drift
- Realistische Bruchbedingung: A maintainer adds a third asset class (e.g. a distinct geldmarkt tranche) to simulator-forced-sale.js in 3-bucket mode without adapting the hard-coded missingness index offsets; buildStressReplayTransactionsForYear would fail closed with an assetClass or index mismatch TypeError, but the failure would only surface when a test or run exercises that specific multi-asset forced-sale configuration
- Eigene Findings: keine
<!-- audit:antigravity-review:end -->

## Review-Antworten von Codex

<!-- audit:codex-responses:begin -->
Noch keine strukturierten Codex-Antworten.
<!-- audit:codex-responses:end -->

## Validierungsattestierung

<!-- audit:validation-attestation:begin -->
### Ereignis 1: `validation-bb6c135049dd`

- Diff-Fingerprint: `bb6c135049dd97fa96be561566bd9179fda487ca5f4214ea007f67332e7dd3d4`
- Status: `PASS`
- Vollständig: `YES`
- Kurzresultat: 1 passed; 0 failed; 0 unavailable; 1 required
- Ausgabedigest: `c50b004b3898f26a060b84becc1b06a6ee4412c29188c22c9ede801d6b9487ad`

| Matrixbefehl | Status | Exitcode | Kompaktausgabe |
|---|---|---:|---|
| shell: npm test | PASS | 0 | &gt; ruhestand-app-final@1.0.0 test<br>&gt; node tests/run-tests.mjs<br><br>🚀 Starting Test Runner...<br>Found 180 test files.<br><br>📂 Running 3bucket-config.test.mjs in process...<br>--- 3-Bucket Config Tests ---<br>✅ 3-Bucket config tests passed<br>✅ 3bucket-config.test.mjs completed.<br>📊 FILE RESULT: 3bucket-config.test.mjs &#124; mode=in-process &#124; assertions=17 &#124; passed=17 &#124; failedAssertions=0 &#124; failedFiles=0<br><br>📂 Running 3bucket-refill.test.mjs in process...<br>--- 3-Bucket Refill Tests ---<br>✅ 3-Bucket refill tests passed<br>✅ 3bucket-refill.test.mjs completed.<br>📊 FILE RESULT: 3bucket-refill.test.mjs &#124; mode=in-process &#124; assertions=32 &#124; passed=32 &#124; failedAssertions=0 &#124; failedFiles=0<br><br>📂 Running architecture-evidence.test.mjs in process...<br>--- Architecture Evidence Contract Tests ---<br>✅ Architecture evidence contract tests passed<br>✅ architecture-evidence.test.mjs completed.<br>📊 FILE RESULT: architecture-evidence.test.mjs &#124; mode=in-process &#124; assertions=24 &#124; passed=24 &#124; failedAssertions=0 &#124; failedFiles=0<br><br>📂 Running auto-optimize-fidelity<br>...[182748 characters omitted]...<br>ete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/app/profile/profile-storage.js:537:28)<br>    at initProfileSubpageLifecycle (file:///mnt/c/Users/Diete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/app/profile/profile-navigation.js:157:5)<br>    at initProfileBridge (file:///mnt/c/Users/Diete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/app/profile/profile-bridge.js:8:5)<br>    at async Promise.all (index 0)<br>    at async MockDocument.dispatch (file:///mnt/c/Users/Diete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/tests/profile-ui-contract.test.mjs:80:9)<br>    at async runProfileUiContractTests (file:///mnt/c/Users/Diete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/tests/profile-ui-contract.test.mjs:244:9)<br>    at async file:///mnt/c/Users/Diete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/tests/profile-ui-contract.test.mjs:257:9<br>[VALIDATION ERROR] Invalid input fields: [<br>  {<br>    fieldId: 'goGoMultiplier',<br>    message: 'goGoMultiplier muss zwischen 1.0 und 1.5 liegen.'<br>  }<br>] |
<!-- audit:validation-attestation:end -->

## Testfreigabe und Pre-Mortem

<!-- audit:test-approval-premortem:begin -->
- Teständerungsfreigabe: nicht erfasst.
- Pre-Mortems:
  - Ereignis 2: In three months, the most likely failure cause is exactly the residual risk above: a maintainer extends &#96;simulator-forced-sale.js&#96; for a bonds-bucket-aware forced sale/payout fallback and forgets to extend the paired missingness-generation branch, and because no test exercises a 3-bucket forced sale with more than two populated breakdown entries, the gap ships silently reviewed-green until a real 3-bucket production run first hits that code path and throws at runtime (fail-closed, but as an unplanned incident rather than a caught regression).
  - Ereignis 3: In three months, the most likely failure cause would be an engine refactoring that introduces a new transaction source or sale mechanic (e.g. automated cross-tranche rebalancing or cash buffer replenishment) with non-standard field naming (e.g. missing canonical grossEur/brutto properties or emitting string-encoded amounts), triggering runtime type errors in readBreakdownMoney and normalizeBreakdown during transaction ingestion.
<!-- audit:test-approval-premortem:end -->

## Findings-Lebenszyklus

<!-- audit:findings:begin -->
Noch keine strukturierten Findings.
<!-- audit:findings:end -->

## Entscheidungstabelle

<!-- audit:decision-table:begin -->
| ID | Quelle | Finding | Klasse | Entscheidung | Umsetzung |
|---|---|---|---|---|---|
| – | – | Noch keine Findings | – | – | – |
<!-- audit:decision-table:end -->

## Rückdokumentation in die Arbeitsplan-MD

Arbeitsplan: `docs/internal/stress-replay-korrekturen-implement-review-02a8cb20.md`

## Freigabestatus

<!-- audit:approval-status:begin -->
- Implementierung bereit: `YES`
- Validierung: `PASS`
- Claude-Freigabe: `YES`
- Antigravity-Freigabe: `YES`
- Red-State-Folgeslice: `NONE`
- Commit autorisiert: `YES`
<!-- audit:approval-status:end -->
