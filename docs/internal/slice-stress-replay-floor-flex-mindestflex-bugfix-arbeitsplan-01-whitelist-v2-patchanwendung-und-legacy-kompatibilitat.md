# Slice 01 – Whitelist V2, Patchanwendung und Legacy-Kompatibilität

**Feature-Branch:** `codex/stress-pfad-replay`
**GitHub-Status:** nur lokal

## Ziel des Slice

Whitelist V2, Patchanwendung und Legacy-Kompatibilität

## Akzeptanzkriterien

- V1 bleibt mit unveränderten Deskriptoren, Verboten und Fingerprints lesbar.
- V2 ergänzt genau Floor, Flex und Mindest-Flex und bewahrt explizite Null.
- Die effektive Mindest-Flex-Relation wird vor Persistenz und Runner geprüft,
  ohne Eingabewerte zu begrenzen.
- Bekannte V1-/V2-Varianten können gemeinsam gespeichert und exportiert
  werden; unbekannte Revisionen scheitern fail-closed.
- Baseline, Variantenpatch und materialisierter Pfad bleiben unverändert.

## Scope und Nicht-Scope

Erlaubter Scope: `app/simulator/stress-replay-contract.js`, `app/simulator/stress-replay-export.js`, `app/simulator/stress-replay-persistence.js`, `app/simulator/stress-replay-runner.js`, `app/simulator/stress-replay-variant.js`, `docs/internal/SLICE_STRESS_REPLAY_BEDARFE_01_VERTRAG_UND_KOMPATIBILITAET.md`, `docs/internal/slice-stress-replay-floor-flex-mindestflex-bugfix-arbeitsplan-01-whitelist-v2-patchanwendung-und-legacy-kompatibilitat.md`, `docs/internal/stress-replay-floor-flex-mindestflex-bugfix-implement-review-b005c9c6.md`, `tests/fixtures/stress-replay-comparison-export-v1.json`, `tests/stress-replay-contract.test.mjs`, `tests/stress-replay-export.test.mjs`, `tests/stress-replay-persistence.test.mjs`, `tests/stress-replay-runner.test.mjs`, `tests/stress-replay-variant.test.mjs`

## Diff-Risiko inklusive Branch- und Statuscheck

Preflight vom 2026-08-16:

- Aktiver Branch: `codex/stress-pfad-replay` (Sollbranch erfüllt).
- Git-Status vor Coding: ausschließlich die vom Orchestrator angelegten,
  unversionierten Slice-/Auditdokumente.
- Änderungstiefe: mittel; kritisch waren Versionsdispatch,
  Fingerprintstabilität und effektive Bedarfsrelation.
- Gefährdete Tests: Contract, Variant, Runner, Persistence und Export.
- Nicht angefasst: Engine, Worker, UI, generierte Artefakte und verwaltete
  Auditblöcke.
- Rollback: gezieltes Wiederherstellen der versionierten Slice-Pfade; neue
  Slice-Dateien nur nach ausdrücklicher Freigabe entfernen.

## Geplante Tests

Die fünf im Arbeitsplan genannten fokussierten Einzelläufe sowie eine
zusätzliche Comparison-Kompatibilitätssonde. Keine agentenseitige
Gesamtmatrix.

## Durchgeführte Änderungen

- Unveränderten V1-Vertrag und neue V2-Whitelist mit drei direkten
  Bedarfsfeldern getrennt modelliert.
- Normalisierung, Snapshotprojektion, No-op-Erkennung, Materialitätsgruppen
  und Patchanwendung an die gespeicherte Whitelistversion gebunden.
- Effektive Bedarfsprüfung mit expliziter Nullsemantik und stabilem
  Relationserror ergänzt; kein Clamping eingeführt.
- Workspacevalidierung um tatsächliche Patchanwendung und Abgleich des
  normalisierten Inputfingerprints erweitert.
- V1-Golden-Exportfixture sowie Null-, Relation-, Legacy-, Mixed-Version-,
  Mutation- und Runner-Durchstichtests ergänzt.

## Ausgeführte Validierung mit Ergebnis

Fokussierte Entwicklerläufe: alle grün.

- Contract: 99 Assertions
- Variant: 53 Assertions
- Runner: 58 Assertions
- Persistence: 62 Assertions
- Export: 26 Assertions nach Mixed-Version- und Import-Tamper-Erweiterung
- Comparison-Kompatibilitätssonde: 35 Assertions
- `git diff --check`: ohne Befund

Die endgültigen Zahlen werden nach dem abschließenden fokussierten Lauf bei
Bedarf berichtigt. Die autoritative Validierungsattestierung wird nur durch
den Orchestrator in den verwalteten Block geschrieben.

## Abweichungen vom Plan

`stress-replay-runner.js`, `stress-replay-persistence.js` und
`stress-replay-export.js` benötigten keine produktive Änderung: Ihre
bestehenden Aufrufe erreichen den zentral erweiterten Varianten-/Workspace-
Validator bereits. Die vorgesehenen Nachweise liegen in den zugehörigen
Tests.

## Offene Risiken

Ein nachgelagerter Consumer außerhalb dieses Slice könnte die V1-Hülle noch
fälschlich mit Whitelist V1 gleichsetzen. UI und echter E2E-Durchstich werden
in Slice 2 und 3 geschlossen. Siehe außerdem den verwalteten
Findings-Lebenszyklus.

## Review-Feedback von Claude

<!-- audit:claude-review:begin -->
### Ereignis 2: Runde 1

- Reviewer: `claude`
- Freigabe: `YES`
- Validierungsbindung: `validation-fbc928c0c819`
- Testdateien: `tests/fixtures/stress-replay-comparison-export-v1.json`, `tests/stress-replay-contract.test.mjs`, `tests/stress-replay-export.test.mjs`, `tests/stress-replay-persistence.test.mjs`, `tests/stress-replay-runner.test.mjs`, `tests/stress-replay-variant.test.mjs`
- Eigene Findings: `C-01`, `C-02`
<!-- audit:claude-review:end -->

## Review-Feedback von Antigravity

<!-- audit:antigravity-review:begin -->
### Ereignis 3: Runde 1

- Reviewer: `antigravity`
- Freigabe: `YES`
- Validierungsbindung: `validation-fbc928c0c819`
- Testdateien: `tests/fixtures/stress-replay-comparison-export-v1.json`, `tests/stress-replay-contract.test.mjs`, `tests/stress-replay-export.test.mjs`, `tests/stress-replay-persistence.test.mjs`, `tests/stress-replay-runner.test.mjs`, `tests/stress-replay-variant.test.mjs`
- Prüfdimensionen: V1/V2 whitelist version dispatch, snapshot projection, zero-value preservation, effective needs validation (&#96;minimumFlexAnnual &lt;= startFlexBedarf&#96;), fail-closed unsupported version rejection, workspace/export fingerprint tamper-proofing, and non-mutating preview/apply behavior
- Größtes Restrisiko: Downstream UI consumers in Slices 2 &amp; 3 failing to handle contract rejections gracefully when live baseline inputs violate the need relation or when partial need patches are constructed
- Realistische Bruchbedingung: A legacy user scenario with &#96;minimumFlexAnnual &gt; startFlexBedarf&#96; in raw baseline inputs is loaded into Slice 2 UI, triggering &#96;STRESS_REPLAY_MINIMUM_FLEX_EXCEEDS_FLEX&#96; during baseline variant creation before the user interacts with the editor
- Eigene Findings: keine
<!-- audit:antigravity-review:end -->

## Review-Antworten von Codex

<!-- audit:codex-responses:begin -->
Noch keine strukturierten Codex-Antworten.
<!-- audit:codex-responses:end -->

## Validierungsattestierung

<!-- audit:validation-attestation:begin -->
### Ereignis 1: `validation-fbc928c0c819`

- Diff-Fingerprint: `fbc928c0c8192f8c86a32f554c607f3654ed18f840391901bc008c4251611ea0`
- Status: `PASS`
- Vollständig: `YES`
- Kurzresultat: 1 passed; 0 failed; 0 unavailable; 1 required
- Ausgabedigest: `4dd7a4036e0ba653e5d5056f3783f89827a934cddcf96ce8a6b5f42b4861c0a2`

| Matrixbefehl | Status | Exitcode | Kompaktausgabe |
|---|---|---:|---|
| shell: npm test | PASS | 0 | &gt; ruhestand-app-final@1.0.0 test<br>&gt; node tests/run-tests.mjs<br><br>🚀 Starting Test Runner...<br>Found 180 test files.<br><br>📂 Running 3bucket-config.test.mjs in process...<br>--- 3-Bucket Config Tests ---<br>✅ 3-Bucket config tests passed<br>✅ 3bucket-config.test.mjs completed.<br>📊 FILE RESULT: 3bucket-config.test.mjs &#124; mode=in-process &#124; assertions=17 &#124; passed=17 &#124; failedAssertions=0 &#124; failedFiles=0<br><br>📂 Running 3bucket-refill.test.mjs in process...<br>--- 3-Bucket Refill Tests ---<br>✅ 3-Bucket refill tests passed<br>✅ 3bucket-refill.test.mjs completed.<br>📊 FILE RESULT: 3bucket-refill.test.mjs &#124; mode=in-process &#124; assertions=32 &#124; passed=32 &#124; failedAssertions=0 &#124; failedFiles=0<br><br>📂 Running architecture-evidence.test.mjs in process...<br>--- Architecture Evidence Contract Tests ---<br>✅ Architecture evidence contract tests passed<br>✅ architecture-evidence.test.mjs completed.<br>📊 FILE RESULT: architecture-evidence.test.mjs &#124; mode=in-process &#124; assertions=24 &#124; passed=24 &#124; failedAssertions=0 &#124; failedFiles=0<br><br>📂 Running auto-optimize-fidelity<br>...[183708 characters omitted]...<br>ete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/app/profile/profile-storage.js:537:28)<br>    at initProfileSubpageLifecycle (file:///mnt/c/Users/Diete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/app/profile/profile-navigation.js:157:5)<br>    at initProfileBridge (file:///mnt/c/Users/Diete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/app/profile/profile-bridge.js:8:5)<br>    at async Promise.all (index 0)<br>    at async MockDocument.dispatch (file:///mnt/c/Users/Diete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/tests/profile-ui-contract.test.mjs:80:9)<br>    at async runProfileUiContractTests (file:///mnt/c/Users/Diete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/tests/profile-ui-contract.test.mjs:244:9)<br>    at async file:///mnt/c/Users/Diete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/tests/profile-ui-contract.test.mjs:257:9<br>[VALIDATION ERROR] Invalid input fields: [<br>  {<br>    fieldId: 'goGoMultiplier',<br>    message: 'goGoMultiplier muss zwischen 1.0 und 1.5 liegen.'<br>  }<br>] |
<!-- audit:validation-attestation:end -->

## Testfreigabe und Pre-Mortem

<!-- audit:test-approval-premortem:begin -->
- Teständerungsfreigabe: nicht erfasst.
- Pre-Mortems:
  - Ereignis 2: Most likely three-month failure: a user or an imported legacy scenario has (or drifts into) &#96;minimumFlexAnnual &gt; startFlexBedarf&#96; in their live main-app inputs; the stress-replay baseline variant creation then throws &#96;STRESS_REPLAY_MINIMUM_FLEX_EXCEEDS_FLEX&#96; with no UI-level explanation yet (Slice 2/3 not merged at review time), producing what looks like a broken feature rather than a data-quality gate, and support has to trace the failure back to this contract-level invariant introduced here.
  - Ereignis 3: Downstream UI components or future API consumers construct partial V2 need patches without supplying the full baseline context or omit pre-submission validation of &#96;minimumFlexAnnual &lt;= startFlexBedarf&#96;, resulting in abrupt contract-level errors rather than inline UI validation feedback.
<!-- audit:test-approval-premortem:end -->

## Findings-Lebenszyklus

<!-- audit:findings:begin -->
### `C-01` — `OPEN`

- Quelle: `claude`; Runde 1
- Klasse: `OBSERVATION`
- Finding: The unconditional effective-needs relation check in &#96;applyStressReplayVariantPatch&#96;/&#96;validateStressReplayEffectiveNeeds&#96; means a baseline whose live inputs already violate &#96;minimumFlexAnnual &lt;= startFlexBedarf&#96; blocks creation of the mandatory baseline variant itself (patch &#96;{}&#96;) and any unrelated alternative patch, not just needs-editing patches. No test in this slice exercises &#96;createStressReplayBaselineVariantV1&#96; or an unrelated non-needs patch against such an invalid baseline to confirm/document this is the intended fail-closed contract rather than an accidental over-broad check; Slice 2/3 (editor, real replay) must be aware they may hit this before ever letting a user edit needs.
- Akzeptanztest: Add a focused test in tests/stress-replay-variant.test.mjs asserting that (a) createStressReplayBaselineVariantV1 with baselineInputs where minimumFlexAnnual &gt; startFlexBedarf fails with STRESS_REPLAY_MINIMUM_FLEX_EXCEEDS_FLEX, and (b) an alternative variant patching only an unrelated field (e.g. maxSkimPctOfEq) against the same invalid baseline fails the same way, documenting the intended scope of this invariant.
- Statusbegründung: –

### `C-02` — `OPEN`

- Quelle: `claude`; Runde 1
- Klasse: `OBSERVATION`
- Finding: &#96;STRESS_REPLAY_FORBIDDEN_VARIANT_PATHS_V2&#96; is derived by filtering only &#96;strategy.minimumFlexAnnual&#96; out of the V1 forbidden list; if &#96;strategy.startFloorBedarf&#96;/&#96;strategy.startFlexBedarf&#96; were already present in &#96;STRESS_REPLAY_FORBIDDEN_VARIANT_PATHS_V1&#96; (plausible, since the slice doc states V2 "adds exactly Floor, Flex and Mindest-Flex" as newly patchable), the exported V2 forbidden-list constant would still list two fields that are in fact whitelisted and patchable under V2. This constant isn't consumed by the normalization/apply logic itself (which checks the whitelist map, not this list), so it is not a correctness bug in this slice, but it is public API that Slice 2's editor could plausibly use to decide which fields to lock, and no test asserts the V2 list's completeness beyond the single minimumFlexAnnual exclusion.
- Akzeptanztest: Add an assertion in tests/stress-replay-contract.test.mjs that STRESS_REPLAY_FORBIDDEN_VARIANT_PATHS_V2 excludes strategy.startFloorBedarf and strategy.startFlexBedarf whenever they are present in the V1 list, or document explicitly in the Slice-1 doc that this constant is documentation-only and must not be used by Slice-2 UI to gate field editability.
- Statusbegründung: –
<!-- audit:findings:end -->

## Entscheidungstabelle

<!-- audit:decision-table:begin -->
| ID | Quelle | Finding | Klasse | Entscheidung | Umsetzung |
|---|---|---|---|---|---|
| C-01 | claude | The unconditional effective-needs relation check in &#96;applyStressReplayVariantPatch&#96;/&#96;validateStressReplayEffectiveNeeds&#96; means a baseline whose live inputs already violate &#96;minimumFlexAnnual &lt;= startFlexBedarf&#96; blocks creation of the mandatory baseline variant itself (patch &#96;{}&#96;) and any unrelated alternative patch, not just needs-editing patches. No test in this slice exercises &#96;createStressReplayBaselineVariantV1&#96; or an unrelated non-needs patch against such an invalid baseline to confirm/document this is the intended fail-closed contract rather than an accidental over-broad check; Slice 2/3 (editor, real replay) must be aware they may hit this before ever letting a user edit needs. | OBSERVATION | offen | offen |
| C-02 | claude | &#96;STRESS_REPLAY_FORBIDDEN_VARIANT_PATHS_V2&#96; is derived by filtering only &#96;strategy.minimumFlexAnnual&#96; out of the V1 forbidden list; if &#96;strategy.startFloorBedarf&#96;/&#96;strategy.startFlexBedarf&#96; were already present in &#96;STRESS_REPLAY_FORBIDDEN_VARIANT_PATHS_V1&#96; (plausible, since the slice doc states V2 "adds exactly Floor, Flex and Mindest-Flex" as newly patchable), the exported V2 forbidden-list constant would still list two fields that are in fact whitelisted and patchable under V2. This constant isn't consumed by the normalization/apply logic itself (which checks the whitelist map, not this list), so it is not a correctness bug in this slice, but it is public API that Slice 2's editor could plausibly use to decide which fields to lock, and no test asserts the V2 list's completeness beyond the single minimumFlexAnnual exclusion. | OBSERVATION | offen | offen |
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
