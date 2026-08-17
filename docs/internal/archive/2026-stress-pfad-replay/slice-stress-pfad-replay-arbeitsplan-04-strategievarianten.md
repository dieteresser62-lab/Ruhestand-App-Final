# Slice 04 – Strategievarianten

**Feature-Branch:** `codex/stress-pfad-replay`
**GitHub-Status:** nur lokal

## Ziel des Slice

Strategievarianten

## Akzeptanzkriterien

Siehe freigegebenen Arbeitsplan.

## Scope und Nicht-Scope

Erlaubter Scope: `app/simulator/stress-replay-contract.js`, `app/simulator/stress-replay-runner.js`, `app/simulator/stress-replay-variant.js`, `docs/internal/slice-stress-pfad-replay-arbeitsplan-04-strategievarianten.md`, `docs/internal/slice-stress-replay-implement-04-strategievarianten.md`, `docs/internal/stress-replay-implement-review-fa2904b2.md`, `tests/stress-replay-variant.test.mjs`

## Diff-Risiko inklusive Branch- und Statuscheck

Branchcheck vor Umsetzung: `codex/stress-pfad-replay` entsprach dem Zielbranch.
Im Status lagen nur der orchestratorverwaltete Auditbericht und diese
Slice-Plan-MD als Voränderungen innerhalb des erlaubten Scopes. Das größte
Diff-Risiko war eine versehentliche Mutation eingefrorener Baselineinputs oder
ein beliebiger Objekt-Merge; die Umsetzung verwendet deshalb ausschließlich
die versionierte Pfad-Whitelist, Deep Clones und Fingerprintprüfungen.

## Geplante Tests

Gemäß Arbeitsplan und Orchestrator-Validierungsmatrix.

## Durchgeführte Änderungen

- `StressReplayVariantV1` um Versions-, Rollen-, Fingerprint- und
  Kanonizitätsvalidierung ergänzt.
- DOM-freie Variantenerzeugung, Patchvorschau und exakte Patchanwendung auf
  geklonte Baselineinputs implementiert.
- Bedingte 3-Bucket-/Longevity-Felder an ihren Modusschalter gebunden und als
  jeweils ein Faktor gruppiert; unabhängige Änderungen erhalten einen
  maschinenlesbaren Mehr-Faktor-Hinweis.
- Runner additiv um Alternativeingaben und -identität erweitert; nur die
  Baseline wird gegen den Quelllog reconciliiert.
- Negativ-, Immutabilitäts-, Fingerprint-, No-op-, Modus- und Runner-Tests
  ergänzt.
- Korrektur zu `C-01`: Der externe Validator erzwingt die Rollen-/ID-Invariante
  nun in beide Richtungen; eine Baseline-Rolle mit umbenannter ID wird
  fail-closed abgewiesen und durch einen Manipulationstest abgesichert.
- Korrektur zu `C-02`: Vertragsfelder und Varianten-Fingerprint-Projektion
  besitzen jetzt eine gemeinsame Source of Truth im Contract-Modul; Erzeuger
  und Validator verwenden dieselbe Projektion.

## Ausgeführte Validierung mit Ergebnis

Codex-Plausibilisierung (keine Freigabe):

- `node tests/run-single.mjs tests/stress-replay-variant.test.mjs`: bestanden.
- `node tests/run-single.mjs tests/stress-replay-runner.test.mjs`: bestanden.
- `node tests/run-single.mjs tests/stress-replay-contract.test.mjs`: bestanden.
- `git diff --check`: bestanden.

Die deterministische Validierungsattestierung wird ausschließlich durch den
Orchestrator in den verwalteten Auditblock projiziert.

## Abweichungen vom Plan

Keine erfasst.

## Offene Risiken

Die UI erzeugt Varianten erst in Slice 09. Bis dahin ist die neue API nur über
DOM-freie Aufrufer und Tests integriert. Findings und Freigaben bleiben dem
externen Review vorbehalten.

## Review-Feedback von Claude

<!-- audit:claude-review:begin -->
### Ereignis 2: Runde 1

- Reviewer: `claude`
- Freigabe: `NO`
- Validierungsbindung: `validation-b6bb005b6aa1`
- Testdateien: `tests/stress-replay-variant.test.mjs`
- Eigene Findings: `C-01`, `C-02`

### Ereignis 4: Runde 2

- Reviewer: `claude`
- Freigabe: `YES`
- Validierungsbindung: `validation-1362699b4bfe`
- Testdateien: `tests/stress-replay-variant.test.mjs`
- Prüfdimensionen: Re-examined (a) bidirectional id/role invariant ordering (runs before fingerprint/patch validation, cannot be short-circuited by a well-formed forged payload), (b) the now-shared fingerprint-basis function for constructor/validator symmetry, (c) &#96;applyStressReplayVariantV1&#96;'s three independent guards (baseline-fingerprint match, applied-fingerprint match against stored &#96;normalizedInputFingerprint&#96;, no-op detection for alternatives) which remain intact and unaffected by this delta, (d) &#96;previewStressReplayVariantPatchV1&#96;'s before/after baseline-input mutation check, (e) mode-controller grouping logic (bucket/longevity) against its three tests, all consistent and no regression introduced by the C-01/C-02 fix.
- Größtes Restrisiko: &#96;validateStressReplayVariantV1&#96; is a fail-closed boundary only if every future producer of variant objects (notably Slice 07 persistence/import rehydration, not yet built) actually routes through it before use; nothing in this module prevents a future caller from constructing/deserializing a variant object and skipping validation as a performance shortcut.
- Realistische Bruchbedingung: a later slice (07 persistence/import, or 06/09 comparison state restore) reconstructs a &#96;StressReplayVariantV1&#96;-shaped object from storage/JSON and passes it directly into &#96;runStressReplayVariantV1&#96;/comparison code without calling &#96;validateStressReplayVariantV1&#96; first, silently reintroducing the class of invariant-violation this slice just closed.
- Eigene Findings: `C-01`, `C-02`
<!-- audit:claude-review:end -->

## Review-Feedback von Antigravity

<!-- audit:antigravity-review:begin -->
### Ereignis 5: Runde 1

- Reviewer: `antigravity`
- Freigabe: `YES`
- Validierungsbindung: `validation-1362699b4bfe`
- Testdateien: `tests/stress-replay-variant.test.mjs`
- Prüfdimensionen: Evaluated variant contract invariants (bidirectional role/id reservation, schema versions, whitelist validation), structural unification of fingerprint basis keys via STRESS_REPLAY_VARIANT_CONTRACT_KEYS_V1, patch normalization and no-op leaf stripping, mode-controller retention for conditional strategies, deep immutability across preview/create/apply pipelines, baseline input immutability guards in both preview and runner, and isolation of alternative re-runs without baseline row reconciliation
- Größtes Restrisiko: Future consumers in Slice 06 (comparison ledger) or Slice 07 (persistence/import) deserializing untrusted variant payloads might bypass validateStressReplayVariantV1 if calling lower-level runner functions directly
- Realistische Bruchbedingung: A custom comparison utility in a downstream slice instantiates raw patch objects without validating the variant envelope first, leading to unnormalized input divergence during delta analysis
- Eigene Findings: keine
<!-- audit:antigravity-review:end -->

## Review-Antworten von Codex

<!-- audit:codex-responses:begin -->
- `C-01` Antwort 1: **angenommen** — Baseline-Varianten mit einer anderen ID als &#96;baseline&#96; werden nun fail-closed abgewiesen und durch einen Manipulationstest abgedeckt.
- `C-02` Antwort 1: **angenommen** — Vertragsfeldliste und Fingerprint-Projektion wurden im Contract-Modul zentralisiert; Erzeuger und Validator verwenden dieselbe Funktion.
<!-- audit:codex-responses:end -->

## Validierungsattestierung

<!-- audit:validation-attestation:begin -->
### Ereignis 1: `validation-b6bb005b6aa1`

- Diff-Fingerprint: `b6bb005b6aa1c34ca3561018f9b4d84bff7fbf6b3455999e4e564c575cfd72e9`
- Status: `PASS`
- Vollständig: `YES`
- Kurzresultat: 1 passed; 0 failed; 0 unavailable; 1 required
- Ausgabedigest: `78e08ce49258f079efac1830031cbffc2a78160bdf7fa7972a7533b49c225708`

| Matrixbefehl | Status | Exitcode | Kompaktausgabe |
|---|---|---:|---|
| shell: npm test | PASS | 0 | &gt; ruhestand-app-final@1.0.0 test<br>&gt; node tests/run-tests.mjs<br><br>🚀 Starting Test Runner...<br>Found 173 test files.<br><br>📂 Running 3bucket-config.test.mjs in process...<br>--- 3-Bucket Config Tests ---<br>✅ 3-Bucket config tests passed<br>✅ 3bucket-config.test.mjs completed.<br>📊 FILE RESULT: 3bucket-config.test.mjs &#124; mode=in-process &#124; assertions=17 &#124; passed=17 &#124; failedAssertions=0 &#124; failedFiles=0<br><br>📂 Running 3bucket-refill.test.mjs in process...<br>--- 3-Bucket Refill Tests ---<br>✅ 3-Bucket refill tests passed<br>✅ 3bucket-refill.test.mjs completed.<br>📊 FILE RESULT: 3bucket-refill.test.mjs &#124; mode=in-process &#124; assertions=32 &#124; passed=32 &#124; failedAssertions=0 &#124; failedFiles=0<br><br>📂 Running architecture-evidence.test.mjs in process...<br>--- Architecture Evidence Contract Tests ---<br>✅ Architecture evidence contract tests passed<br>✅ architecture-evidence.test.mjs completed.<br>📊 FILE RESULT: architecture-evidence.test.mjs &#124; mode=in-process &#124; assertions=24 &#124; passed=24 &#124; failedAssertions=0 &#124; failedFiles=0<br><br>📂 Running auto-optimize-fidelity<br>...[177302 characters omitted]...<br>ete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/app/profile/profile-storage.js:537:28)<br>    at initProfileSubpageLifecycle (file:///mnt/c/Users/Diete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/app/profile/profile-navigation.js:157:5)<br>    at initProfileBridge (file:///mnt/c/Users/Diete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/app/profile/profile-bridge.js:8:5)<br>    at async Promise.all (index 0)<br>    at async MockDocument.dispatch (file:///mnt/c/Users/Diete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/tests/profile-ui-contract.test.mjs:80:9)<br>    at async runProfileUiContractTests (file:///mnt/c/Users/Diete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/tests/profile-ui-contract.test.mjs:244:9)<br>    at async file:///mnt/c/Users/Diete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/tests/profile-ui-contract.test.mjs:257:9<br>[VALIDATION ERROR] Invalid input fields: [<br>  {<br>    fieldId: 'goGoMultiplier',<br>    message: 'goGoMultiplier muss zwischen 1.0 und 1.5 liegen.'<br>  }<br>] |

### Ereignis 3: `validation-1362699b4bfe`

- Diff-Fingerprint: `1362699b4bfe41c803a2b82f900271a156b5bf0188d918153d95ddfa2bfd0378`
- Status: `PASS`
- Vollständig: `YES`
- Kurzresultat: 1 passed; 0 failed; 0 unavailable; 1 required
- Ausgabedigest: `0ae7c175641b9e21ff594b25d14d37be243ab49199788a05bf0d80cbf3bd35f0`

| Matrixbefehl | Status | Exitcode | Kompaktausgabe |
|---|---|---:|---|
| shell: npm test | PASS | 0 | &gt; ruhestand-app-final@1.0.0 test<br>&gt; node tests/run-tests.mjs<br><br>🚀 Starting Test Runner...<br>Found 173 test files.<br><br>📂 Running 3bucket-config.test.mjs in process...<br>--- 3-Bucket Config Tests ---<br>✅ 3-Bucket config tests passed<br>✅ 3bucket-config.test.mjs completed.<br>📊 FILE RESULT: 3bucket-config.test.mjs &#124; mode=in-process &#124; assertions=17 &#124; passed=17 &#124; failedAssertions=0 &#124; failedFiles=0<br><br>📂 Running 3bucket-refill.test.mjs in process...<br>--- 3-Bucket Refill Tests ---<br>✅ 3-Bucket refill tests passed<br>✅ 3bucket-refill.test.mjs completed.<br>📊 FILE RESULT: 3bucket-refill.test.mjs &#124; mode=in-process &#124; assertions=32 &#124; passed=32 &#124; failedAssertions=0 &#124; failedFiles=0<br><br>📂 Running architecture-evidence.test.mjs in process...<br>--- Architecture Evidence Contract Tests ---<br>✅ Architecture evidence contract tests passed<br>✅ architecture-evidence.test.mjs completed.<br>📊 FILE RESULT: architecture-evidence.test.mjs &#124; mode=in-process &#124; assertions=24 &#124; passed=24 &#124; failedAssertions=0 &#124; failedFiles=0<br><br>📂 Running auto-optimize-fidelity<br>...[177302 characters omitted]...<br>ete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/app/profile/profile-storage.js:537:28)<br>    at initProfileSubpageLifecycle (file:///mnt/c/Users/Diete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/app/profile/profile-navigation.js:157:5)<br>    at initProfileBridge (file:///mnt/c/Users/Diete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/app/profile/profile-bridge.js:8:5)<br>    at async Promise.all (index 0)<br>    at async MockDocument.dispatch (file:///mnt/c/Users/Diete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/tests/profile-ui-contract.test.mjs:80:9)<br>    at async runProfileUiContractTests (file:///mnt/c/Users/Diete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/tests/profile-ui-contract.test.mjs:244:9)<br>    at async file:///mnt/c/Users/Diete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/tests/profile-ui-contract.test.mjs:257:9<br>[VALIDATION ERROR] Invalid input fields: [<br>  {<br>    fieldId: 'goGoMultiplier',<br>    message: 'goGoMultiplier muss zwischen 1.0 und 1.5 liegen.'<br>  }<br>] |
<!-- audit:validation-attestation:end -->

## Testfreigabe und Pre-Mortem

<!-- audit:test-approval-premortem:begin -->
- Teständerungsfreigabe: nicht erfasst.
- Pre-Mortems:
  - Ereignis 2: In three months, the most likely failure is a Slice 07 import/restore path deserializing an old or externally-modified session that contains a baseline-role variant object whose &#96;id&#96; was renamed or corrupted (e.g., by a manual JSON edit or a future migration bug), passing &#96;validateStressReplayVariantV1&#96; unblocked because the id/role coupling is unenforced (C-01), and then silently failing to be recognized as "the" baseline slot by id-keyed comparison/UI code introduced in later slices — surfacing as a duplicate or missing baseline row in the variant comparison view long after this slice was approved.
  - Ereignis 4: In three months, the most likely failure is that Slice 07's persistence/import path (not yet implemented) deserializes a variant object and, for a performance or "already trusted" reason, skips the now-correct &#96;validateStressReplayVariantV1&#96; boundary before handing it to the runner or comparison ledger — silently resurrecting the exact id/role divergence this slice just fixed, but only for the import path rather than the in-memory constructor path, and it would only surface as a confusing duplicate/missing baseline slot in a much later UI slice.
  - Ereignis 5: In three months, the most likely point of failure is downstream comparison logic in Slice 06 or renderer logic in Slice 09 assuming that alternative variant runs and baseline runs share identical yearResults lengths and index alignment, throwing when an aggressive alternative strategy causes divergence in survival horizon or ruin timing compared to the baseline path.
<!-- audit:test-approval-premortem:end -->

## Findings-Lebenszyklus

<!-- audit:findings:begin -->
### `C-01` — `CLOSED`

- Quelle: `claude`; Runde 1
- Klasse: `BLOCKER`
- Finding: validateStressReplayVariantV1 only forbids &#96;role==='alternative' &amp;&amp; id==='baseline'&#96;; it never enforces the mirror invariant that &#96;role==='baseline'&#96; variants must use the reserved id &#96;'baseline'&#96;. This validator is the fail-closed boundary for externally-sourced (persisted/imported, Slice 07) variant objects, and &#96;createStressReplayVariantV1&#96; (the only trusted constructor) always forces &#96;id='baseline'&#96; for baseline role — showing the invariant is intended but not defended. A crafted/corrupted object &#96;{role:'baseline', id:'not-baseline', patch:{}, materialChangeGroups:[], warnings:[], normalizedInputFingerprint===baselineScenarioFingerprint, variantFingerprint recomputed to match}&#96; passes validation, letting downstream id-keyed baseline-slot logic (runner's &#96;variant?.id
- Akzeptanztest: &#124; STRESS_REPLAY_BASELINE_VARIANT_ID&#96; fallback, future comparison/UI code in Slices 06/09 that may key off &#96;id==='baseline'&#96;) diverge silently from role-based logic. &#124; Extend tests/stress-replay-variant.test.mjs with a case that builds an otherwise-valid baseline-role object with a non-'baseline' id (fingerprint recomputed to match) and asserts validateStressReplayVariantV1 throws STRESS_REPLAY_CONTRACT_INVALID. VALIDATE: ["node","tests/run-single.mjs","tests/stress-replay-variant.test.mjs"]
- Statusbegründung: The round-2 diff adds the missing mirror check in validateStressReplayVariantV1 (&#96;app/simulator/stress-replay-contract.js&#96;): &#96;(role==='baseline' &amp;&amp; id!=='baseline') &#124;&#124; (role==='alternative' &amp;&amp; id==='baseline')&#96; now fails closed with STRESS_REPLAY_CONTRACT_INVALID. tests/stress-replay-variant.test.mjs Test 5 adds the exact acceptance case: a &#96;renamedBaseline&#96; object (baseline role, id &#96;'not-baseline'&#96;, fingerprint recomputed via the canonical projection to match) is asserted to throw STRESS_REPLAY_CONTRACT_INVALID. This is the precise externally-sourced-object attack scenario in the original finding (baseline-role object with a foreign id and a self-consistent recomputed fingerprint), and it is now rejected before any id-keyed downstream logic could see it. Verified by reading the check placement (runs before fingerprint/patch checks, so it cannot be bypassed by an otherwise-valid payload) and the test assertion wording/target error code.

### `C-02` — `CLOSED`

- Quelle: `claude`; Runde 1
- Klasse: `OBSERVATION`
- Finding: The "canonical variant fingerprint basis" is defined twice with different mechanisms: &#96;createVariantFingerprint&#96; in stress-replay-variant.js is an explicit, hand-maintained key allowlist that omits &#96;label&#96;, while &#96;validateStressReplayVariantV1&#96;'s recomputation in stress-replay-contract.js derives its basis via &#96;{ ...variant } minus variantFingerprint&#96; (a rest-spread that includes every other allowed key, including &#96;label&#96;). Test 5 ("labels must not affect fingerprints") only proves today's &#96;createStressReplayFingerprint&#96;/canonicalizer neutralizes this divergence (not verifiable from this diff since that function body is out of scope); if it does not, or if a future field is added to &#96;allowedKeys&#96; without a matching manual update in &#96;createVariantFingerprint&#96;, every freshly created variant would fail its own self-validation inside &#96;createStressReplayVariantV1&#96; — a determinism-oracle regression hard to trace back to this duplication.
- Akzeptanztest: Add a coupling/regression test that derives &#96;createVariantFingerprint&#96;'s key list from the same source-of-truth as &#96;validateStressReplayVariantV1&#96;'s &#96;allowedKeys&#96; (excluding &#96;label&#96;/&#96;variantFingerprint&#96;) instead of a hand-duplicated list, or add an explicit test asserting a synthetic new allowed field participates identically in both fingerprint code paths. VALIDATE: ["node","tests/run-single.mjs","tests/stress-replay-variant.test.mjs"]
- Statusbegründung: The duplication is eliminated structurally, not just tested around: &#96;STRESS_REPLAY_VARIANT_CONTRACT_KEYS_V1&#96; (contract.js) is now the single source of truth for both the validator's &#96;allowedKeys&#96; whitelist and the new exported &#96;createStressReplayVariantFingerprint(variant)&#96;, which both the constructor (&#96;createStressReplayVariantV1&#96; in stress-replay-variant.js, now importing this function instead of hand-rolling its own key list) and the validator's self-check (&#96;expectedVariantFingerprint = createStressReplayVariantFingerprint(variant)&#96;) call. A future field added to the contract-keys array automatically participates identically on both sides; there is no longer a hand-maintained second list to drift. Test 5 adds a direct coupling assertion: &#96;skimVariant.variantFingerprint.value === createStressReplayVariantFingerprint(skimVariant).value&#96;. This satisfies the acceptance criterion (shared source-of-truth over "new test for one synthetic field").
<!-- audit:findings:end -->

## Entscheidungstabelle

<!-- audit:decision-table:begin -->
| ID | Quelle | Finding | Klasse | Entscheidung | Umsetzung |
|---|---|---|---|---|---|
| C-01 | claude | validateStressReplayVariantV1 only forbids &#96;role==='alternative' &amp;&amp; id==='baseline'&#96;; it never enforces the mirror invariant that &#96;role==='baseline'&#96; variants must use the reserved id &#96;'baseline'&#96;. This validator is the fail-closed boundary for externally-sourced (persisted/imported, Slice 07) variant objects, and &#96;createStressReplayVariantV1&#96; (the only trusted constructor) always forces &#96;id='baseline'&#96; for baseline role — showing the invariant is intended but not defended. A crafted/corrupted object &#96;{role:'baseline', id:'not-baseline', patch:{}, materialChangeGroups:[], warnings:[], normalizedInputFingerprint===baselineScenarioFingerprint, variantFingerprint recomputed to match}&#96; passes validation, letting downstream id-keyed baseline-slot logic (runner's &#96;variant?.id | BLOCKER | angenommen | erledigt: The round-2 diff adds the missing mirror check in validateStressReplayVariantV1 (&#96;app/simulator/stress-replay-contract.js&#96;): &#96;(role==='baseline' &amp;&amp; id!=='baseline') &#124;&#124; (role==='alternative' &amp;&amp; id==='baseline')&#96; now fails closed with STRESS_REPLAY_CONTRACT_INVALID. tests/stress-replay-variant.test.mjs Test 5 adds the exact acceptance case: a &#96;renamedBaseline&#96; object (baseline role, id &#96;'not-baseline'&#96;, fingerprint recomputed via the canonical projection to match) is asserted to throw STRESS_REPLAY_CONTRACT_INVALID. This is the precise externally-sourced-object attack scenario in the original finding (baseline-role object with a foreign id and a self-consistent recomputed fingerprint), and it is now rejected before any id-keyed downstream logic could see it. Verified by reading the check placement (runs before fingerprint/patch checks, so it cannot be bypassed by an otherwise-valid payload) and the test assertion wording/target error code. |
| C-02 | claude | The "canonical variant fingerprint basis" is defined twice with different mechanisms: &#96;createVariantFingerprint&#96; in stress-replay-variant.js is an explicit, hand-maintained key allowlist that omits &#96;label&#96;, while &#96;validateStressReplayVariantV1&#96;'s recomputation in stress-replay-contract.js derives its basis via &#96;{ ...variant } minus variantFingerprint&#96; (a rest-spread that includes every other allowed key, including &#96;label&#96;). Test 5 ("labels must not affect fingerprints") only proves today's &#96;createStressReplayFingerprint&#96;/canonicalizer neutralizes this divergence (not verifiable from this diff since that function body is out of scope); if it does not, or if a future field is added to &#96;allowedKeys&#96; without a matching manual update in &#96;createVariantFingerprint&#96;, every freshly created variant would fail its own self-validation inside &#96;createStressReplayVariantV1&#96; — a determinism-oracle regression hard to trace back to this duplication. | OBSERVATION | angenommen | erledigt: The duplication is eliminated structurally, not just tested around: &#96;STRESS_REPLAY_VARIANT_CONTRACT_KEYS_V1&#96; (contract.js) is now the single source of truth for both the validator's &#96;allowedKeys&#96; whitelist and the new exported &#96;createStressReplayVariantFingerprint(variant)&#96;, which both the constructor (&#96;createStressReplayVariantV1&#96; in stress-replay-variant.js, now importing this function instead of hand-rolling its own key list) and the validator's self-check (&#96;expectedVariantFingerprint = createStressReplayVariantFingerprint(variant)&#96;) call. A future field added to the contract-keys array automatically participates identically on both sides; there is no longer a hand-maintained second list to drift. Test 5 adds a direct coupling assertion: &#96;skimVariant.variantFingerprint.value === createStressReplayVariantFingerprint(skimVariant).value&#96;. This satisfies the acceptance criterion (shared source-of-truth over "new test for one synthetic field"). |
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
