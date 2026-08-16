# Slice 03 – Echter Replay-Durchstich, Dokumentation und Abschlussgates

**Feature-Branch:** `codex/stress-pfad-replay`
**GitHub-Status:** nur lokal

## Ziel des Slice

Echter Replay-Durchstich, Dokumentation und Abschlussgates

## Akzeptanzkriterien

Siehe freigegebenen Arbeitsplan.

## Scope und Nicht-Scope

Erlaubter Scope: `Handbuch.html`, `README.md`, `docs/internal/SLICE_STRESS_REPLAY_BEDARFE_03_DURCHSTICH_UND_DOKUMENTATION.md`, `docs/internal/slice-stress-replay-floor-flex-mindestflex-bugfix-arbeitsplan-03-echter-replay-durchstich-dokumentation-und-abschlussgates.md`, `docs/internal/stress-replay-floor-flex-mindestflex-bugfix-implement-review-b005c9c6.md`, `docs/reference/SIMULATOR_MODULES_README.md`, `docs/reference/TECHNICAL.md`, `tests/README.md`, `tests/browser-smoke.test.mjs`, `tests/stress-replay-e2e.test.mjs`

## Diff-Risiko inklusive Branch- und Statuscheck

Vor Umsetzung geprüft: aktiver Branch `codex/stress-pfad-replay`; im
Arbeitsbaum lagen ausschließlich die vom Orchestrator angelegten Slice-3-
Artefakte. Produktive Änderungsgruppe: nur `Handbuch.html`; übrige Änderungen
betreffen Tests und Dokumentation. Keine Engine-, Worker-, Persistenz- oder
Contractquelle wird in Slice 3 geändert.

## Geplante Tests

Gemäß Arbeitsplan und Orchestrator-Validierungsmatrix.

## Durchgeführte Änderungen

- Echter V2-Bedarfsdurchstich über 60 Jahre mit Pfad-/Source- und
  Baseline-Non-Mutation-Orakeln ergänzt.
- Floor-/Flex-Finanzwirkung und Mindest-Flex-Engine-Diagnostik nachgewiesen.
- Expliziten Nullfall durch Export, Import und erneuten Runnerlauf geführt.
- V1-Golden-Import geprüft und einen echten V1-Export nach Import erneut
  ausgeführt.
- Echten Contractfehler bis zur deutschsprachigen UI-Formatierung und in die
  Browser-Statusregion geführt.
- Nutzer-, Architektur-, Modul- und Testdokumentation synchronisiert.

## Ausgeführte Validierung mit Ergebnis

Fokussierter Entwicklerlauf
`node tests/run-single.mjs tests/stress-replay-e2e.test.mjs`: PASS (32/32
Assertions). `git diff --check`: PASS. Der direkte Lauf
`node tests/browser-smoke.test.mjs` erreichte wegen der Agentensandbox den
Teststart nicht (`listen EPERM 127.0.0.1`); die Browsermatrix wird deshalb
vom Orchestrator außerhalb dieser Portrestriktion ausgeführt. Die
autoritative Gesamtmatrix und Attestierung werden durch den Orchestrator
projiziert.

## Abweichungen vom Plan

Die eingecheckte V1-Golden-Fixture besitzt nur einen einjährigen
Contract-/Importpfad ohne vollständig materialisierten Household-State und
ist daher nicht direkt runnerfähig. Ihre V1-Identität wird unverändert als
Golden-Import geprüft; für das verlangte erneute Ausführen erzeugt der E2E-
Test zusätzlich einen echten V1-Export auf dem materialisierten 60-Jahres-
Pfad und importiert diesen. Die Performancefixture bleibt unverändert.

## Offene Risiken

Siehe Findings-Lebenszyklus. Die Performancebaseline umfasst weiterhin nur
Baseline plus eine Alternative; zusätzliche fachliche Variantenläufe ändern
das historische Budget nicht.

## Review-Feedback von Claude

<!-- audit:claude-review:begin -->
### Ereignis 2: Runde 1

- Reviewer: `claude`
- Freigabe: `YES`
- Validierungsbindung: `validation-a8538ab070bd`
- Testdateien: `tests/README.md`, `tests/browser-smoke.test.mjs`, `tests/stress-replay-e2e.test.mjs`
- Eigene Findings: `C-01`, `C-02`, `C-03`, `C-04`, `C-05`
<!-- audit:claude-review:end -->

## Review-Feedback von Antigravity

<!-- audit:antigravity-review:begin -->
### Ereignis 3: Runde 1

- Reviewer: `antigravity`
- Freigabe: `YES`
- Validierungsbindung: `validation-a8538ab070bd`
- Testdateien: `tests/README.md`, `tests/browser-smoke.test.mjs`, `tests/stress-replay-e2e.test.mjs`
- Prüfdimensionen: E2E 60-year path replay, baseline and source immutability, V2 needs engine diagnostics, zero-needs export/import roundtrip, legacy V1 backward compatibility, contract-to-UI error message interpolation, live DOM status assertions in browser-smoke, and documentation sync across Handbuch/README/technical references
- Größtes Restrisiko: Engine-level inflation escalation divergence for minimumFlexConfiguredAnnualEur across long horizons masked by single-year assertion
- Realistische Bruchbedingung: Future engine refactoring alters annual minimum-flex indexing while nominal patch values remain unescalated, satisfying single-year .some(...) check despite multi-year trajectory drift
- Eigene Findings: keine
<!-- audit:antigravity-review:end -->

## Review-Antworten von Codex

<!-- audit:codex-responses:begin -->
- `C-01` Antwort 1: **angenommen** — Die Beobachtung ist valide; der verlangte Variantentest liegt außerhalb der Slice-03-Allowlist und bleibt reviewer-owned offen.
- `C-02` Antwort 1: **angenommen** — Die öffentliche Forbidden-List verdient den genannten Vollständigkeitsnachweis; der Contract-Test liegt außerhalb der aktuellen Allowlist.
- `C-03` Antwort 1: **angenommen** — Der Statusübergang ist ein plausibler UI-Randfall; Quellcode und geforderter UI-Test gehören zum abgeschlossenen Slice-02-Scope und wurden in Slice 03 nicht außerhalb der Allowlist verändert.
- `C-04` Antwort 1: **angenommen** — Der E2E-Test erzeugt nun den echten Contractfehler und prüft die deutsche Meldung einschließlich beider korrekter Beträge.
<!-- audit:codex-responses:end -->

## Validierungsattestierung

<!-- audit:validation-attestation:begin -->
### Ereignis 1: `validation-a8538ab070bd`

- Diff-Fingerprint: `a8538ab070bd2fc45a6099ea42cbd28c3265eadd547ce03b8ac8813755fd74ac`
- Status: `PASS`
- Vollständig: `YES`
- Kurzresultat: 1 passed; 0 failed; 0 unavailable; 1 required
- Ausgabedigest: `721ccf190bd42e863a3707141b8df01bdf91c9d925541fc9223c0b84799455f3`

| Matrixbefehl | Status | Exitcode | Kompaktausgabe |
|---|---|---:|---|
| shell: npm test | PASS | 0 | &gt; ruhestand-app-final@1.0.0 test<br>&gt; node tests/run-tests.mjs<br><br>🚀 Starting Test Runner...<br>Found 180 test files.<br><br>📂 Running 3bucket-config.test.mjs in process...<br>--- 3-Bucket Config Tests ---<br>✅ 3-Bucket config tests passed<br>✅ 3bucket-config.test.mjs completed.<br>📊 FILE RESULT: 3bucket-config.test.mjs &#124; mode=in-process &#124; assertions=17 &#124; passed=17 &#124; failedAssertions=0 &#124; failedFiles=0<br><br>📂 Running 3bucket-refill.test.mjs in process...<br>--- 3-Bucket Refill Tests ---<br>✅ 3-Bucket refill tests passed<br>✅ 3bucket-refill.test.mjs completed.<br>📊 FILE RESULT: 3bucket-refill.test.mjs &#124; mode=in-process &#124; assertions=32 &#124; passed=32 &#124; failedAssertions=0 &#124; failedFiles=0<br><br>📂 Running architecture-evidence.test.mjs in process...<br>--- Architecture Evidence Contract Tests ---<br>✅ Architecture evidence contract tests passed<br>✅ architecture-evidence.test.mjs completed.<br>📊 FILE RESULT: architecture-evidence.test.mjs &#124; mode=in-process &#124; assertions=24 &#124; passed=24 &#124; failedAssertions=0 &#124; failedFiles=0<br><br>📂 Running auto-optimize-fidelity<br>...[183895 characters omitted]...<br>ete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/app/profile/profile-storage.js:537:28)<br>    at initProfileSubpageLifecycle (file:///mnt/c/Users/Diete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/app/profile/profile-navigation.js:157:5)<br>    at initProfileBridge (file:///mnt/c/Users/Diete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/app/profile/profile-bridge.js:8:5)<br>    at async Promise.all (index 0)<br>    at async MockDocument.dispatch (file:///mnt/c/Users/Diete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/tests/profile-ui-contract.test.mjs:80:9)<br>    at async runProfileUiContractTests (file:///mnt/c/Users/Diete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/tests/profile-ui-contract.test.mjs:244:9)<br>    at async file:///mnt/c/Users/Diete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/tests/profile-ui-contract.test.mjs:257:9<br>[VALIDATION ERROR] Invalid input fields: [<br>  {<br>    fieldId: 'goGoMultiplier',<br>    message: 'goGoMultiplier muss zwischen 1.0 und 1.5 liegen.'<br>  }<br>] |
<!-- audit:validation-attestation:end -->

## Testfreigabe und Pre-Mortem

<!-- audit:test-approval-premortem:begin -->
- Teständerungsfreigabe: nicht erfasst.
- Pre-Mortems:
  - Ereignis 2: Most likely three-month failure: a later change to the engine's per-year minimum-flex diagnostic pipeline (e.g. introducing yearly escalation/inflation-indexation of &#96;minimumFlexConfiguredAnnualEur&#96;, or a bug that only sets it correctly in the first replayed year) ships silently because the only regression guard for the non-zero needs case uses &#96;.some(...)&#96; instead of &#96;.every(...)&#96;, while the zero-case guard (which would still trivially pass under such a regression, since 0 stays 0) gives false confidence that the whole needs-propagation path is covered end-to-end.
  - Ereignis 3: In three months, the most likely failure cause is that future modifications to engine inflation indexing or decumulation shortfall logging alter the year-by-year propagation of minimumFlexConfiguredAnnualEur across long-horizon stress paths without failing the single-year .some(...) assertion in stress-replay-e2e.test.mjs, allowing trajectory divergence across later retirement years to go undetected until visual breakdown inspection.
<!-- audit:test-approval-premortem:end -->

## Findings-Lebenszyklus

<!-- audit:findings:begin -->
### `C-01` — `OPEN`

- Quelle: `claude`; Runde 1
- Klasse: `OBSERVATION`
- Finding: The unconditional effective-needs relation check in &#96;applyStressReplayVariantPatch&#96;/&#96;validateStressReplayEffectiveNeeds&#96; means a baseline whose live inputs already violate &#96;minimumFlexAnnual &lt;= startFlexBedarf&#96; blocks creation of the mandatory baseline variant itself (patch &#96;{}&#96;) and any unrelated alternative patch, not just needs-editing patches. No test in this slice exercises &#96;createStressReplayBaselineVariantV1&#96; or an unrelated non-needs patch against such an invalid baseline to confirm/document this is the intended fail-closed contract rather than an accidental over-broad check; Slice 2/3 (editor, real replay) must be aware they may hit this before ever letting a user edit needs.
- Akzeptanztest: Add a focused test in tests/stress-replay-variant.test.mjs asserting that (a) createStressReplayBaselineVariantV1 with baselineInputs where minimumFlexAnnual &gt; startFlexBedarf fails with STRESS_REPLAY_MINIMUM_FLEX_EXCEEDS_FLEX, and (b) an alternative variant patching only an unrelated field (e.g. maxSkimPctOfEq) against the same invalid baseline fails the same way, documenting the intended scope of this invariant.
- Statusbegründung: Slice 03's file scope is documentation/test-only (&#96;Handbuch.html&#96;, &#96;README.md&#96;, docs, &#96;tests/*&#96;); no line of &#96;stress-replay-contract.js&#96; or any other production source touched by C-01 is modified in this diff, so nothing in this slice can retire the underlying risk. Remains open and carried forward to the branch-wide final review, where the production-source fix or an equivalent regression test must be re-checked.

### `C-02` — `OPEN`

- Quelle: `claude`; Runde 1
- Klasse: `OBSERVATION`
- Finding: &#96;STRESS_REPLAY_FORBIDDEN_VARIANT_PATHS_V2&#96; is derived by filtering only &#96;strategy.minimumFlexAnnual&#96; out of the V1 forbidden list; if &#96;strategy.startFloorBedarf&#96;/&#96;strategy.startFlexBedarf&#96; were already present in &#96;STRESS_REPLAY_FORBIDDEN_VARIANT_PATHS_V1&#96; (plausible, since the slice doc states V2 "adds exactly Floor, Flex and Mindest-Flex" as newly patchable), the exported V2 forbidden-list constant would still list two fields that are in fact whitelisted and patchable under V2. This constant isn't consumed by the normalization/apply logic itself (which checks the whitelist map, not this list), so it is not a correctness bug in this slice, but it is public API that Slice 2's editor could plausibly use to decide which fields to lock, and no test asserts the V2 list's completeness beyond the single minimumFlexAnnual exclusion.
- Akzeptanztest: Add an assertion in tests/stress-replay-contract.test.mjs that STRESS_REPLAY_FORBIDDEN_VARIANT_PATHS_V2 excludes strategy.startFloorBedarf and strategy.startFlexBedarf whenever they are present in the V1 list, or document explicitly in the Slice-1 doc that this constant is documentation-only and must not be used by Slice-2 UI to gate field editability.
- Statusbegründung: Same rationale as C-01: this slice's diff contains no production/runtime source changes (&#96;-ui.js&#96;, &#96;-runner.js&#96;, &#96;-variant.js&#96; untouched), so the condition that originally justified C-02 is unchanged by Slice 03 and cannot be closed here. Remains open, carried forward to the branch-wide final review.

### `C-03` — `OPEN`

- Quelle: `claude`; Runde 1
- Klasse: `OBSERVATION`
- Finding: In &#96;previewEditorPatch&#96;, the &#96;region.dataset.patchError&#96; sentinel is only ever written/cleared for the single code &#96;STRESS_REPLAY_MINIMUM_FLEX_EXCEEDS_FLEX&#96;. If the preview transitions from that error to a *different* validation error and back to success, the stale sentinel from the first error would still be read as &#96;true&#96; on the eventual success path, triggering the "Die Patchvorschau ist zulässig." announcement while never having explicitly announced the second, different error through this same code path. No test in this Slice exercises an error-type transition (only the single-error and pure-toggle cases are covered), so this edge-case status/aria-live regression would not be caught by regression tests.
- Akzeptanztest: Add a stress-replay-ui.test.mjs case that first triggers &#96;STRESS_REPLAY_MINIMUM_FLEX_EXCEEDS_FLEX&#96;, then triggers an unrelated preview error (e.g. a whitelist/schema rejection), and finally a successful preview, asserting the status text/dataset.status reflect only the current error at each step and that the "zulässig" announcement fires exactly once, only after the truly last error was cleared.
- Statusbegründung: Unaffected by this slice for the same reason: Slice 03 touches only docs/tests, not the production code path C-03 concerns. Remains open, carried forward to the branch-wide final review.

### `C-04` — `CLOSED`

- Quelle: `claude`; Runde 1
- Klasse: `OBSERVATION`
- Finding: &#96;formatStressReplayUiError&#96;'s new branch depends on &#96;error.details.{minimumFlexAnnual,startFlexBedarf}&#96; being produced exactly this way by Slice 1's contract validator (&#96;app/simulator/stress-replay-contract.js&#96;, out of this Slice's scope). This Slice's only coverage of that mapping (Test 11 in tests/stress-replay-ui.test.mjs) constructs a hand-rolled mock error rather than invoking the real contract function, and no browser-smoke/e2e assertion in this packet exercises the real end-to-end error text. A future rename or restructuring of the real error's &#96;details&#96; shape in Slice 1/3 would silently break the German message (fields would render as &#96;undefined&#96;/&#96;unbekannt&#96;) without failing any test owned by this Slice.
- Akzeptanztest: Add an integration-level assertion (either importing the real &#96;applyStressReplayVariantPatch&#96;/validator from stress-replay-contract.js in a unit test, or an e2e assertion in tests/stress-replay-e2e.test.mjs in Slice 3) that triggers the genuine &#96;STRESS_REPLAY_MINIMUM_FLEX_EXCEEDS_FLEX&#96; error and asserts &#96;formatStressReplayUiError&#96; produces the expected German text with correct amounts.
- Statusbegründung: The acceptance test is met on two independent paths: (1) &#96;tests/stress-replay-e2e.test.mjs&#96; now triggers the genuine &#96;STRESS_REPLAY_MINIMUM_FLEX_EXCEEDS_FLEX&#96; error via the real &#96;createStressReplayVariantV1&#96;/contract validator (not a mock) and asserts &#96;formatStressReplayUiError&#96; renders both correct German-formatted amounts (&#96;6.000&#96;, &#96;5.000&#96;); (2) &#96;tests/browser-smoke.test.mjs&#96; independently re-verifies the same real contract→UI mapping live in the DOM status/aria-live region via the real &#96;createStressReplayController&#96;. Both close the originally identified risk that a details-shape drift in Slice 1's contract would silently degrade to &#96;unbekannt&#96; without any test noticing.

### `C-05` — `OPEN`

- Quelle: `claude`; Runde 1
- Klasse: `OBSERVATION`
- Finding: The new "needs" e2e block asserts real-engine propagation of the configured minimum-flex value with &#96;needsFinancialRows.some(record =&gt; record.minimumFlexConfiguredAnnualEur === 8000)&#96; (any single year), while the adjacent zero-value block in the same file uses &#96;.every(...)&#96; for the analogous check. If &#96;minimumFlexConfiguredAnnualEur&#96; is expected to hold steady (not intentionally re-escalated) across the horizon for a fixed nominal patch value, &#96;.some&#96; would not catch a regression where only the first year reflects the configured value and later years silently drift or reset to the baseline/default. No test in this packet documents whether escalation of this field across years is expected behavior, so the weaker assertion cannot currently be distinguished from an intentional design choice.
- Akzeptanztest: acceptance=Either (a) change the assertion to &#96;.every(...)&#96; if &#96;minimumFlexConfiguredAnnualEur&#96; is expected to stay constant at the patched value across the replayed horizon for a nominal (non-indexed) patch, or (b) if per-year escalation/indexation is intended, add an explicit assertion (e.g. first-year equals exactly 8000 and the trajectory is monotonic/consistent with the documented indexation rule) so the "some" check cannot silently hide a mid-horizon reset to baseline.
- Statusbegründung: –
<!-- audit:findings:end -->

## Entscheidungstabelle

<!-- audit:decision-table:begin -->
| ID | Quelle | Finding | Klasse | Entscheidung | Umsetzung |
|---|---|---|---|---|---|
| C-01 | claude | The unconditional effective-needs relation check in &#96;applyStressReplayVariantPatch&#96;/&#96;validateStressReplayEffectiveNeeds&#96; means a baseline whose live inputs already violate &#96;minimumFlexAnnual &lt;= startFlexBedarf&#96; blocks creation of the mandatory baseline variant itself (patch &#96;{}&#96;) and any unrelated alternative patch, not just needs-editing patches. No test in this slice exercises &#96;createStressReplayBaselineVariantV1&#96; or an unrelated non-needs patch against such an invalid baseline to confirm/document this is the intended fail-closed contract rather than an accidental over-broad check; Slice 2/3 (editor, real replay) must be aware they may hit this before ever letting a user edit needs. | OBSERVATION | angenommen | offen |
| C-02 | claude | &#96;STRESS_REPLAY_FORBIDDEN_VARIANT_PATHS_V2&#96; is derived by filtering only &#96;strategy.minimumFlexAnnual&#96; out of the V1 forbidden list; if &#96;strategy.startFloorBedarf&#96;/&#96;strategy.startFlexBedarf&#96; were already present in &#96;STRESS_REPLAY_FORBIDDEN_VARIANT_PATHS_V1&#96; (plausible, since the slice doc states V2 "adds exactly Floor, Flex and Mindest-Flex" as newly patchable), the exported V2 forbidden-list constant would still list two fields that are in fact whitelisted and patchable under V2. This constant isn't consumed by the normalization/apply logic itself (which checks the whitelist map, not this list), so it is not a correctness bug in this slice, but it is public API that Slice 2's editor could plausibly use to decide which fields to lock, and no test asserts the V2 list's completeness beyond the single minimumFlexAnnual exclusion. | OBSERVATION | angenommen | offen |
| C-03 | claude | In &#96;previewEditorPatch&#96;, the &#96;region.dataset.patchError&#96; sentinel is only ever written/cleared for the single code &#96;STRESS_REPLAY_MINIMUM_FLEX_EXCEEDS_FLEX&#96;. If the preview transitions from that error to a *different* validation error and back to success, the stale sentinel from the first error would still be read as &#96;true&#96; on the eventual success path, triggering the "Die Patchvorschau ist zulässig." announcement while never having explicitly announced the second, different error through this same code path. No test in this Slice exercises an error-type transition (only the single-error and pure-toggle cases are covered), so this edge-case status/aria-live regression would not be caught by regression tests. | OBSERVATION | angenommen | offen |
| C-04 | claude | &#96;formatStressReplayUiError&#96;'s new branch depends on &#96;error.details.{minimumFlexAnnual,startFlexBedarf}&#96; being produced exactly this way by Slice 1's contract validator (&#96;app/simulator/stress-replay-contract.js&#96;, out of this Slice's scope). This Slice's only coverage of that mapping (Test 11 in tests/stress-replay-ui.test.mjs) constructs a hand-rolled mock error rather than invoking the real contract function, and no browser-smoke/e2e assertion in this packet exercises the real end-to-end error text. A future rename or restructuring of the real error's &#96;details&#96; shape in Slice 1/3 would silently break the German message (fields would render as &#96;undefined&#96;/&#96;unbekannt&#96;) without failing any test owned by this Slice. | OBSERVATION | angenommen | erledigt: The acceptance test is met on two independent paths: (1) &#96;tests/stress-replay-e2e.test.mjs&#96; now triggers the genuine &#96;STRESS_REPLAY_MINIMUM_FLEX_EXCEEDS_FLEX&#96; error via the real &#96;createStressReplayVariantV1&#96;/contract validator (not a mock) and asserts &#96;formatStressReplayUiError&#96; renders both correct German-formatted amounts (&#96;6.000&#96;, &#96;5.000&#96;); (2) &#96;tests/browser-smoke.test.mjs&#96; independently re-verifies the same real contract→UI mapping live in the DOM status/aria-live region via the real &#96;createStressReplayController&#96;. Both close the originally identified risk that a details-shape drift in Slice 1's contract would silently degrade to &#96;unbekannt&#96; without any test noticing. |
| C-05 | claude | The new "needs" e2e block asserts real-engine propagation of the configured minimum-flex value with &#96;needsFinancialRows.some(record =&gt; record.minimumFlexConfiguredAnnualEur === 8000)&#96; (any single year), while the adjacent zero-value block in the same file uses &#96;.every(...)&#96; for the analogous check. If &#96;minimumFlexConfiguredAnnualEur&#96; is expected to hold steady (not intentionally re-escalated) across the horizon for a fixed nominal patch value, &#96;.some&#96; would not catch a regression where only the first year reflects the configured value and later years silently drift or reset to the baseline/default. No test in this packet documents whether escalation of this field across years is expected behavior, so the weaker assertion cannot currently be distinguished from an intentional design choice. | OBSERVATION | offen | offen |
<!-- audit:decision-table:end -->

## Rückdokumentation in die Arbeitsplan-MD

Arbeitsplan: `docs/internal/stress-replay-floor-flex-mindestflex-bugfix-implement-review-b005c9c6.md`

## Freigabestatus

<!-- audit:approval-status:begin -->
- Implementierung bereit: `YES`
- Validierung: `PASS`
- Claude-Freigabe: `YES`
- Antigravity-Freigabe: `YES`
- Red-State-Folgeslice: `NONE`
- Commit autorisiert: `YES`
<!-- audit:approval-status:end -->
