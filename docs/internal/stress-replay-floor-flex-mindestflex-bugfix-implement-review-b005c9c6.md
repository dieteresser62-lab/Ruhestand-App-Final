# Overall audit – Stress_Replay_Floor_Flex_Mindestflex_Bugfix-implement

Dieses Dokument wird vom Orchestrator geführt. Slice-Dokumente entstehen erst beim tatsächlichen Beginn ihrer Implementierung.

- Task-Datei: `inbox/Stress_Replay_Floor_Flex_Mindestflex_Bugfix-implement.md`
- Run-ID: `watch-20260816-171402.227034Z-093b64a2eb11`
- Zielbranch: `codex/stress-pfad-replay`
- Deklarierter Produktscope: `Handbuch.html`, `README.md`, `Simulator.html`, `app/simulator/stress-replay-contract.js`, `app/simulator/stress-replay-export.js`, `app/simulator/stress-replay-persistence.js`, `app/simulator/stress-replay-renderer.js`, `app/simulator/stress-replay-runner.js`, `app/simulator/stress-replay-ui.js`, `app/simulator/stress-replay-variant.js`, `docs/internal/SLICE_STRESS_REPLAY_BEDARFE_01_VERTRAG_UND_KOMPATIBILITAET.md`, `docs/internal/SLICE_STRESS_REPLAY_BEDARFE_02_EDITOR_UND_EXPERTENFELDER.md`, `docs/internal/SLICE_STRESS_REPLAY_BEDARFE_03_DURCHSTICH_UND_DOKUMENTATION.md`, `docs/internal/slice-stress-replay-floor-flex-mindestflex-bugfix-arbeitsplan-01-whitelist-v2-patchanwendung-und-legacy-kompatibilitat.md`, `docs/internal/slice-stress-replay-floor-flex-mindestflex-bugfix-arbeitsplan-02-fokussierter-editor-und-expertenfelder.md`, `docs/internal/slice-stress-replay-floor-flex-mindestflex-bugfix-arbeitsplan-03-echter-replay-durchstich-dokumentation-und-abschlussgates.md`, `docs/reference/SIMULATOR_MODULES_README.md`, `docs/reference/TECHNICAL.md`, `simulator.css`, `tests/README.md`, `tests/browser-smoke.test.mjs`, `tests/fixtures/stress-replay-comparison-export-v1.json`, `tests/stress-replay-contract.test.mjs`, `tests/stress-replay-e2e.test.mjs`, `tests/stress-replay-export.test.mjs`, `tests/stress-replay-persistence.test.mjs`, `tests/stress-replay-renderer.test.mjs`, `tests/stress-replay-runner.test.mjs`, `tests/stress-replay-ui.test.mjs`, `tests/stress-replay-variant.test.mjs`

## Orchestrator-Prüfprotokoll

### Review-Feedback von Claude

<!-- audit:claude-review:begin -->
#### Work Unit 01 – Planung

- Auftrag: Planung und Review der geordneten Implementierungsslices
- Scope: `Handbuch.html`, `README.md`, `Simulator.html`, `app/simulator/stress-replay-contract.js`, `app/simulator/stress-replay-export.js`, `app/simulator/stress-replay-persistence.js`, `app/simulator/stress-replay-renderer.js`, `app/simulator/stress-replay-runner.js`, `app/simulator/stress-replay-ui.js`, `app/simulator/stress-replay-variant.js`, `docs/internal/SLICE_STRESS_REPLAY_BEDARFE_01_VERTRAG_UND_KOMPATIBILITAET.md`, `docs/internal/SLICE_STRESS_REPLAY_BEDARFE_02_EDITOR_UND_EXPERTENFELDER.md`, `docs/internal/SLICE_STRESS_REPLAY_BEDARFE_03_DURCHSTICH_UND_DOKUMENTATION.md`, `docs/internal/slice-stress-replay-floor-flex-mindestflex-bugfix-arbeitsplan-01-whitelist-v2-patchanwendung-und-legacy-kompatibilitat.md`, `docs/internal/slice-stress-replay-floor-flex-mindestflex-bugfix-arbeitsplan-02-fokussierter-editor-und-expertenfelder.md`, `docs/internal/slice-stress-replay-floor-flex-mindestflex-bugfix-arbeitsplan-03-echter-replay-durchstich-dokumentation-und-abschlussgates.md`, `docs/internal/stress-replay-floor-flex-mindestflex-bugfix-implement-review-b005c9c6.md`, `docs/reference/SIMULATOR_MODULES_README.md`, `docs/reference/TECHNICAL.md`, `simulator.css`, `tests/README.md`, `tests/browser-smoke.test.mjs`, `tests/fixtures/stress-replay-comparison-export-v1.json`, `tests/stress-replay-contract.test.mjs`, `tests/stress-replay-e2e.test.mjs`, `tests/stress-replay-export.test.mjs`, `tests/stress-replay-persistence.test.mjs`, `tests/stress-replay-renderer.test.mjs`, `tests/stress-replay-runner.test.mjs`, `tests/stress-replay-ui.test.mjs`, `tests/stress-replay-variant.test.mjs`

Noch kein strukturiertes Reviewereignis.

#### Work Unit 02 – Slice 01

- Auftrag: Whitelist V2, Patchanwendung und Legacy-Kompatibilität
- Scope: `app/simulator/stress-replay-contract.js`, `app/simulator/stress-replay-export.js`, `app/simulator/stress-replay-persistence.js`, `app/simulator/stress-replay-runner.js`, `app/simulator/stress-replay-variant.js`, `docs/internal/SLICE_STRESS_REPLAY_BEDARFE_01_VERTRAG_UND_KOMPATIBILITAET.md`, `docs/internal/slice-stress-replay-floor-flex-mindestflex-bugfix-arbeitsplan-01-whitelist-v2-patchanwendung-und-legacy-kompatibilitat.md`, `docs/internal/stress-replay-floor-flex-mindestflex-bugfix-implement-review-b005c9c6.md`, `tests/fixtures/stress-replay-comparison-export-v1.json`, `tests/stress-replay-contract.test.mjs`, `tests/stress-replay-export.test.mjs`, `tests/stress-replay-persistence.test.mjs`, `tests/stress-replay-runner.test.mjs`, `tests/stress-replay-variant.test.mjs`

### Ereignis 2: Runde 1

- Reviewer: `claude`
- Freigabe: `YES`
- Validierungsbindung: `validation-fbc928c0c819`
- Testdateien: `tests/fixtures/stress-replay-comparison-export-v1.json`, `tests/stress-replay-contract.test.mjs`, `tests/stress-replay-export.test.mjs`, `tests/stress-replay-persistence.test.mjs`, `tests/stress-replay-runner.test.mjs`, `tests/stress-replay-variant.test.mjs`
- Eigene Findings: `C-01`, `C-02`

#### Work Unit 03 – Slice 02

- Auftrag: Fokussierter Editor und Expertenfelder
- Scope: `Simulator.html`, `app/simulator/stress-replay-renderer.js`, `app/simulator/stress-replay-ui.js`, `docs/internal/SLICE_STRESS_REPLAY_BEDARFE_02_EDITOR_UND_EXPERTENFELDER.md`, `docs/internal/slice-stress-replay-floor-flex-mindestflex-bugfix-arbeitsplan-02-fokussierter-editor-und-expertenfelder.md`, `docs/internal/stress-replay-floor-flex-mindestflex-bugfix-implement-review-b005c9c6.md`, `simulator.css`, `tests/browser-smoke.test.mjs`, `tests/stress-replay-renderer.test.mjs`, `tests/stress-replay-ui.test.mjs`

### Ereignis 2: Runde 1

- Reviewer: `claude`
- Freigabe: `YES`
- Validierungsbindung: `validation-027c86583644`
- Testdateien: `tests/browser-smoke.test.mjs`, `tests/stress-replay-renderer.test.mjs`, `tests/stress-replay-ui.test.mjs`
- Eigene Findings: `C-01`, `C-02`
<!-- audit:claude-review:end -->

### Review-Feedback von Antigravity

<!-- audit:antigravity-review:begin -->
#### Work Unit 01 – Planung

- Auftrag: Planung und Review der geordneten Implementierungsslices
- Scope: `Handbuch.html`, `README.md`, `Simulator.html`, `app/simulator/stress-replay-contract.js`, `app/simulator/stress-replay-export.js`, `app/simulator/stress-replay-persistence.js`, `app/simulator/stress-replay-renderer.js`, `app/simulator/stress-replay-runner.js`, `app/simulator/stress-replay-ui.js`, `app/simulator/stress-replay-variant.js`, `docs/internal/SLICE_STRESS_REPLAY_BEDARFE_01_VERTRAG_UND_KOMPATIBILITAET.md`, `docs/internal/SLICE_STRESS_REPLAY_BEDARFE_02_EDITOR_UND_EXPERTENFELDER.md`, `docs/internal/SLICE_STRESS_REPLAY_BEDARFE_03_DURCHSTICH_UND_DOKUMENTATION.md`, `docs/internal/slice-stress-replay-floor-flex-mindestflex-bugfix-arbeitsplan-01-whitelist-v2-patchanwendung-und-legacy-kompatibilitat.md`, `docs/internal/slice-stress-replay-floor-flex-mindestflex-bugfix-arbeitsplan-02-fokussierter-editor-und-expertenfelder.md`, `docs/internal/slice-stress-replay-floor-flex-mindestflex-bugfix-arbeitsplan-03-echter-replay-durchstich-dokumentation-und-abschlussgates.md`, `docs/internal/stress-replay-floor-flex-mindestflex-bugfix-implement-review-b005c9c6.md`, `docs/reference/SIMULATOR_MODULES_README.md`, `docs/reference/TECHNICAL.md`, `simulator.css`, `tests/README.md`, `tests/browser-smoke.test.mjs`, `tests/fixtures/stress-replay-comparison-export-v1.json`, `tests/stress-replay-contract.test.mjs`, `tests/stress-replay-e2e.test.mjs`, `tests/stress-replay-export.test.mjs`, `tests/stress-replay-persistence.test.mjs`, `tests/stress-replay-renderer.test.mjs`, `tests/stress-replay-runner.test.mjs`, `tests/stress-replay-ui.test.mjs`, `tests/stress-replay-variant.test.mjs`

Noch kein strukturiertes Reviewereignis.

#### Work Unit 02 – Slice 01

- Auftrag: Whitelist V2, Patchanwendung und Legacy-Kompatibilität
- Scope: `app/simulator/stress-replay-contract.js`, `app/simulator/stress-replay-export.js`, `app/simulator/stress-replay-persistence.js`, `app/simulator/stress-replay-runner.js`, `app/simulator/stress-replay-variant.js`, `docs/internal/SLICE_STRESS_REPLAY_BEDARFE_01_VERTRAG_UND_KOMPATIBILITAET.md`, `docs/internal/slice-stress-replay-floor-flex-mindestflex-bugfix-arbeitsplan-01-whitelist-v2-patchanwendung-und-legacy-kompatibilitat.md`, `docs/internal/stress-replay-floor-flex-mindestflex-bugfix-implement-review-b005c9c6.md`, `tests/fixtures/stress-replay-comparison-export-v1.json`, `tests/stress-replay-contract.test.mjs`, `tests/stress-replay-export.test.mjs`, `tests/stress-replay-persistence.test.mjs`, `tests/stress-replay-runner.test.mjs`, `tests/stress-replay-variant.test.mjs`

### Ereignis 3: Runde 1

- Reviewer: `antigravity`
- Freigabe: `YES`
- Validierungsbindung: `validation-fbc928c0c819`
- Testdateien: `tests/fixtures/stress-replay-comparison-export-v1.json`, `tests/stress-replay-contract.test.mjs`, `tests/stress-replay-export.test.mjs`, `tests/stress-replay-persistence.test.mjs`, `tests/stress-replay-runner.test.mjs`, `tests/stress-replay-variant.test.mjs`
- Prüfdimensionen: V1/V2 whitelist version dispatch, snapshot projection, zero-value preservation, effective needs validation (&#96;minimumFlexAnnual &lt;= startFlexBedarf&#96;), fail-closed unsupported version rejection, workspace/export fingerprint tamper-proofing, and non-mutating preview/apply behavior
- Größtes Restrisiko: Downstream UI consumers in Slices 2 &amp; 3 failing to handle contract rejections gracefully when live baseline inputs violate the need relation or when partial need patches are constructed
- Realistische Bruchbedingung: A legacy user scenario with &#96;minimumFlexAnnual &gt; startFlexBedarf&#96; in raw baseline inputs is loaded into Slice 2 UI, triggering &#96;STRESS_REPLAY_MINIMUM_FLEX_EXCEEDS_FLEX&#96; during baseline variant creation before the user interacts with the editor
- Eigene Findings: keine

#### Work Unit 03 – Slice 02

- Auftrag: Fokussierter Editor und Expertenfelder
- Scope: `Simulator.html`, `app/simulator/stress-replay-renderer.js`, `app/simulator/stress-replay-ui.js`, `docs/internal/SLICE_STRESS_REPLAY_BEDARFE_02_EDITOR_UND_EXPERTENFELDER.md`, `docs/internal/slice-stress-replay-floor-flex-mindestflex-bugfix-arbeitsplan-02-fokussierter-editor-und-expertenfelder.md`, `docs/internal/stress-replay-floor-flex-mindestflex-bugfix-implement-review-b005c9c6.md`, `simulator.css`, `tests/browser-smoke.test.mjs`, `tests/stress-replay-renderer.test.mjs`, `tests/stress-replay-ui.test.mjs`

### Ereignis 3: Runde 1

- Reviewer: `antigravity`
- Freigabe: `YES`
- Validierungsbindung: `validation-027c86583644`
- Testdateien: `tests/browser-smoke.test.mjs`, `tests/stress-replay-renderer.test.mjs`, `tests/stress-replay-ui.test.mjs`
- Prüfdimensionen: HTML structure, ARIA accessibility attributes, CSS styling, renderer KPI/group labels, baseline Euro formatting, UI error mapping, DOM-local toggle state preservation, form reset lifecycle, and slice boundary adherence
- Größtes Restrisiko: Contract detail property restructuring in stress-replay-contract.js silently degrading German error interpolation to 'unbekannt' placeholders in the UI
- Realistische Bruchbedingung: A future refactoring of STRESS_REPLAY_MINIMUM_FLEX_EXCEEDS_FLEX in stress-replay-contract.js modifies details.startFlexBedarf or details.minimumFlexAnnual without updating formatStressReplayUiError, leading to missing amounts in user-facing validation messages
- Eigene Findings: keine
<!-- audit:antigravity-review:end -->

### Review-Antworten von Codex

<!-- audit:codex-responses:begin -->
#### Work Unit 01 – Planung

- Auftrag: Planung und Review der geordneten Implementierungsslices
- Scope: `Handbuch.html`, `README.md`, `Simulator.html`, `app/simulator/stress-replay-contract.js`, `app/simulator/stress-replay-export.js`, `app/simulator/stress-replay-persistence.js`, `app/simulator/stress-replay-renderer.js`, `app/simulator/stress-replay-runner.js`, `app/simulator/stress-replay-ui.js`, `app/simulator/stress-replay-variant.js`, `docs/internal/SLICE_STRESS_REPLAY_BEDARFE_01_VERTRAG_UND_KOMPATIBILITAET.md`, `docs/internal/SLICE_STRESS_REPLAY_BEDARFE_02_EDITOR_UND_EXPERTENFELDER.md`, `docs/internal/SLICE_STRESS_REPLAY_BEDARFE_03_DURCHSTICH_UND_DOKUMENTATION.md`, `docs/internal/slice-stress-replay-floor-flex-mindestflex-bugfix-arbeitsplan-01-whitelist-v2-patchanwendung-und-legacy-kompatibilitat.md`, `docs/internal/slice-stress-replay-floor-flex-mindestflex-bugfix-arbeitsplan-02-fokussierter-editor-und-expertenfelder.md`, `docs/internal/slice-stress-replay-floor-flex-mindestflex-bugfix-arbeitsplan-03-echter-replay-durchstich-dokumentation-und-abschlussgates.md`, `docs/internal/stress-replay-floor-flex-mindestflex-bugfix-implement-review-b005c9c6.md`, `docs/reference/SIMULATOR_MODULES_README.md`, `docs/reference/TECHNICAL.md`, `simulator.css`, `tests/README.md`, `tests/browser-smoke.test.mjs`, `tests/fixtures/stress-replay-comparison-export-v1.json`, `tests/stress-replay-contract.test.mjs`, `tests/stress-replay-e2e.test.mjs`, `tests/stress-replay-export.test.mjs`, `tests/stress-replay-persistence.test.mjs`, `tests/stress-replay-renderer.test.mjs`, `tests/stress-replay-runner.test.mjs`, `tests/stress-replay-ui.test.mjs`, `tests/stress-replay-variant.test.mjs`

Noch keine strukturierten Codex-Antworten.

#### Work Unit 02 – Slice 01

- Auftrag: Whitelist V2, Patchanwendung und Legacy-Kompatibilität
- Scope: `app/simulator/stress-replay-contract.js`, `app/simulator/stress-replay-export.js`, `app/simulator/stress-replay-persistence.js`, `app/simulator/stress-replay-runner.js`, `app/simulator/stress-replay-variant.js`, `docs/internal/SLICE_STRESS_REPLAY_BEDARFE_01_VERTRAG_UND_KOMPATIBILITAET.md`, `docs/internal/slice-stress-replay-floor-flex-mindestflex-bugfix-arbeitsplan-01-whitelist-v2-patchanwendung-und-legacy-kompatibilitat.md`, `docs/internal/stress-replay-floor-flex-mindestflex-bugfix-implement-review-b005c9c6.md`, `tests/fixtures/stress-replay-comparison-export-v1.json`, `tests/stress-replay-contract.test.mjs`, `tests/stress-replay-export.test.mjs`, `tests/stress-replay-persistence.test.mjs`, `tests/stress-replay-runner.test.mjs`, `tests/stress-replay-variant.test.mjs`

Noch keine strukturierten Codex-Antworten.

#### Work Unit 03 – Slice 02

- Auftrag: Fokussierter Editor und Expertenfelder
- Scope: `Simulator.html`, `app/simulator/stress-replay-renderer.js`, `app/simulator/stress-replay-ui.js`, `docs/internal/SLICE_STRESS_REPLAY_BEDARFE_02_EDITOR_UND_EXPERTENFELDER.md`, `docs/internal/slice-stress-replay-floor-flex-mindestflex-bugfix-arbeitsplan-02-fokussierter-editor-und-expertenfelder.md`, `docs/internal/stress-replay-floor-flex-mindestflex-bugfix-implement-review-b005c9c6.md`, `simulator.css`, `tests/browser-smoke.test.mjs`, `tests/stress-replay-renderer.test.mjs`, `tests/stress-replay-ui.test.mjs`

Noch keine strukturierten Codex-Antworten.
<!-- audit:codex-responses:end -->

### Validierungsattestierung

<!-- audit:validation-attestation:begin -->
#### Work Unit 01 – Planung

- Auftrag: Planung und Review der geordneten Implementierungsslices
- Scope: `Handbuch.html`, `README.md`, `Simulator.html`, `app/simulator/stress-replay-contract.js`, `app/simulator/stress-replay-export.js`, `app/simulator/stress-replay-persistence.js`, `app/simulator/stress-replay-renderer.js`, `app/simulator/stress-replay-runner.js`, `app/simulator/stress-replay-ui.js`, `app/simulator/stress-replay-variant.js`, `docs/internal/SLICE_STRESS_REPLAY_BEDARFE_01_VERTRAG_UND_KOMPATIBILITAET.md`, `docs/internal/SLICE_STRESS_REPLAY_BEDARFE_02_EDITOR_UND_EXPERTENFELDER.md`, `docs/internal/SLICE_STRESS_REPLAY_BEDARFE_03_DURCHSTICH_UND_DOKUMENTATION.md`, `docs/internal/slice-stress-replay-floor-flex-mindestflex-bugfix-arbeitsplan-01-whitelist-v2-patchanwendung-und-legacy-kompatibilitat.md`, `docs/internal/slice-stress-replay-floor-flex-mindestflex-bugfix-arbeitsplan-02-fokussierter-editor-und-expertenfelder.md`, `docs/internal/slice-stress-replay-floor-flex-mindestflex-bugfix-arbeitsplan-03-echter-replay-durchstich-dokumentation-und-abschlussgates.md`, `docs/internal/stress-replay-floor-flex-mindestflex-bugfix-implement-review-b005c9c6.md`, `docs/reference/SIMULATOR_MODULES_README.md`, `docs/reference/TECHNICAL.md`, `simulator.css`, `tests/README.md`, `tests/browser-smoke.test.mjs`, `tests/fixtures/stress-replay-comparison-export-v1.json`, `tests/stress-replay-contract.test.mjs`, `tests/stress-replay-e2e.test.mjs`, `tests/stress-replay-export.test.mjs`, `tests/stress-replay-persistence.test.mjs`, `tests/stress-replay-renderer.test.mjs`, `tests/stress-replay-runner.test.mjs`, `tests/stress-replay-ui.test.mjs`, `tests/stress-replay-variant.test.mjs`

Noch keine strukturierte Validierungsattestierung.

#### Work Unit 02 – Slice 01

- Auftrag: Whitelist V2, Patchanwendung und Legacy-Kompatibilität
- Scope: `app/simulator/stress-replay-contract.js`, `app/simulator/stress-replay-export.js`, `app/simulator/stress-replay-persistence.js`, `app/simulator/stress-replay-runner.js`, `app/simulator/stress-replay-variant.js`, `docs/internal/SLICE_STRESS_REPLAY_BEDARFE_01_VERTRAG_UND_KOMPATIBILITAET.md`, `docs/internal/slice-stress-replay-floor-flex-mindestflex-bugfix-arbeitsplan-01-whitelist-v2-patchanwendung-und-legacy-kompatibilitat.md`, `docs/internal/stress-replay-floor-flex-mindestflex-bugfix-implement-review-b005c9c6.md`, `tests/fixtures/stress-replay-comparison-export-v1.json`, `tests/stress-replay-contract.test.mjs`, `tests/stress-replay-export.test.mjs`, `tests/stress-replay-persistence.test.mjs`, `tests/stress-replay-runner.test.mjs`, `tests/stress-replay-variant.test.mjs`

### Ereignis 1: `validation-fbc928c0c819`

- Diff-Fingerprint: `fbc928c0c8192f8c86a32f554c607f3654ed18f840391901bc008c4251611ea0`
- Status: `PASS`
- Vollständig: `YES`
- Kurzresultat: 1 passed; 0 failed; 0 unavailable; 1 required
- Ausgabedigest: `4dd7a4036e0ba653e5d5056f3783f89827a934cddcf96ce8a6b5f42b4861c0a2`

| Matrixbefehl | Status | Exitcode | Kompaktausgabe |
|---|---|---:|---|
| shell: npm test | PASS | 0 | &gt; ruhestand-app-final@1.0.0 test<br>&gt; node tests/run-tests.mjs<br><br>🚀 Starting Test Runner...<br>Found 180 test files.<br><br>📂 Running 3bucket-config.test.mjs in process...<br>--- 3-Bucket Config Tests ---<br>✅ 3-Bucket config tests passed<br>✅ 3bucket-config.test.mjs completed.<br>📊 FILE RESULT: 3bucket-config.test.mjs &#124; mode=in-process &#124; assertions=17 &#124; passed=17 &#124; failedAssertions=0 &#124; failedFiles=0<br><br>📂 Running 3bucket-refill.test.mjs in process...<br>--- 3-Bucket Refill Tests ---<br>✅ 3-Bucket refill tests passed<br>✅ 3bucket-refill.test.mjs completed.<br>📊 FILE RESULT: 3bucket-refill.test.mjs &#124; mode=in-process &#124; assertions=32 &#124; passed=32 &#124; failedAssertions=0 &#124; failedFiles=0<br><br>📂 Running architecture-evidence.test.mjs in process...<br>--- Architecture Evidence Contract Tests ---<br>✅ Architecture evidence contract tests passed<br>✅ architecture-evidence.test.mjs completed.<br>📊 FILE RESULT: architecture-evidence.test.mjs &#124; mode=in-process &#124; assertions=24 &#124; passed=24 &#124; failedAssertions=0 &#124; failedFiles=0<br><br>📂 Running auto-optimize-fidelity<br>...[183708 characters omitted]...<br>ete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/app/profile/profile-storage.js:537:28)<br>    at initProfileSubpageLifecycle (file:///mnt/c/Users/Diete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/app/profile/profile-navigation.js:157:5)<br>    at initProfileBridge (file:///mnt/c/Users/Diete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/app/profile/profile-bridge.js:8:5)<br>    at async Promise.all (index 0)<br>    at async MockDocument.dispatch (file:///mnt/c/Users/Diete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/tests/profile-ui-contract.test.mjs:80:9)<br>    at async runProfileUiContractTests (file:///mnt/c/Users/Diete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/tests/profile-ui-contract.test.mjs:244:9)<br>    at async file:///mnt/c/Users/Diete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/tests/profile-ui-contract.test.mjs:257:9<br>[VALIDATION ERROR] Invalid input fields: [<br>  {<br>    fieldId: 'goGoMultiplier',<br>    message: 'goGoMultiplier muss zwischen 1.0 und 1.5 liegen.'<br>  }<br>] |

#### Work Unit 03 – Slice 02

- Auftrag: Fokussierter Editor und Expertenfelder
- Scope: `Simulator.html`, `app/simulator/stress-replay-renderer.js`, `app/simulator/stress-replay-ui.js`, `docs/internal/SLICE_STRESS_REPLAY_BEDARFE_02_EDITOR_UND_EXPERTENFELDER.md`, `docs/internal/slice-stress-replay-floor-flex-mindestflex-bugfix-arbeitsplan-02-fokussierter-editor-und-expertenfelder.md`, `docs/internal/stress-replay-floor-flex-mindestflex-bugfix-implement-review-b005c9c6.md`, `simulator.css`, `tests/browser-smoke.test.mjs`, `tests/stress-replay-renderer.test.mjs`, `tests/stress-replay-ui.test.mjs`

### Ereignis 1: `validation-027c86583644`

- Diff-Fingerprint: `027c86583644acd7458e27d8debcc38e9d646999c3f9b31c53f16704ba554c6e`
- Status: `PASS`
- Vollständig: `YES`
- Kurzresultat: 1 passed; 0 failed; 0 unavailable; 1 required
- Ausgabedigest: `c16b5da8ae4dd15e9bae10b4e3b1ee57bb8342ed14d1f22e9a6c66d8582554d4`

| Matrixbefehl | Status | Exitcode | Kompaktausgabe |
|---|---|---:|---|
| shell: npm test | PASS | 0 | &gt; ruhestand-app-final@1.0.0 test<br>&gt; node tests/run-tests.mjs<br><br>🚀 Starting Test Runner...<br>Found 180 test files.<br><br>📂 Running 3bucket-config.test.mjs in process...<br>--- 3-Bucket Config Tests ---<br>✅ 3-Bucket config tests passed<br>✅ 3bucket-config.test.mjs completed.<br>📊 FILE RESULT: 3bucket-config.test.mjs &#124; mode=in-process &#124; assertions=17 &#124; passed=17 &#124; failedAssertions=0 &#124; failedFiles=0<br><br>📂 Running 3bucket-refill.test.mjs in process...<br>--- 3-Bucket Refill Tests ---<br>✅ 3-Bucket refill tests passed<br>✅ 3bucket-refill.test.mjs completed.<br>📊 FILE RESULT: 3bucket-refill.test.mjs &#124; mode=in-process &#124; assertions=32 &#124; passed=32 &#124; failedAssertions=0 &#124; failedFiles=0<br><br>📂 Running architecture-evidence.test.mjs in process...<br>--- Architecture Evidence Contract Tests ---<br>✅ Architecture evidence contract tests passed<br>✅ architecture-evidence.test.mjs completed.<br>📊 FILE RESULT: architecture-evidence.test.mjs &#124; mode=in-process &#124; assertions=24 &#124; passed=24 &#124; failedAssertions=0 &#124; failedFiles=0<br><br>📂 Running auto-optimize-fidelity<br>...[183895 characters omitted]...<br>ete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/app/profile/profile-storage.js:537:28)<br>    at initProfileSubpageLifecycle (file:///mnt/c/Users/Diete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/app/profile/profile-navigation.js:157:5)<br>    at initProfileBridge (file:///mnt/c/Users/Diete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/app/profile/profile-bridge.js:8:5)<br>    at async Promise.all (index 0)<br>    at async MockDocument.dispatch (file:///mnt/c/Users/Diete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/tests/profile-ui-contract.test.mjs:80:9)<br>    at async runProfileUiContractTests (file:///mnt/c/Users/Diete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/tests/profile-ui-contract.test.mjs:244:9)<br>    at async file:///mnt/c/Users/Diete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/tests/profile-ui-contract.test.mjs:257:9<br>[VALIDATION ERROR] Invalid input fields: [<br>  {<br>    fieldId: 'goGoMultiplier',<br>    message: 'goGoMultiplier muss zwischen 1.0 und 1.5 liegen.'<br>  }<br>] |
<!-- audit:validation-attestation:end -->

### Testfreigabe und Pre-Mortem

<!-- audit:test-approval-premortem:begin -->
#### Work Unit 01 – Planung

- Auftrag: Planung und Review der geordneten Implementierungsslices
- Scope: `Handbuch.html`, `README.md`, `Simulator.html`, `app/simulator/stress-replay-contract.js`, `app/simulator/stress-replay-export.js`, `app/simulator/stress-replay-persistence.js`, `app/simulator/stress-replay-renderer.js`, `app/simulator/stress-replay-runner.js`, `app/simulator/stress-replay-ui.js`, `app/simulator/stress-replay-variant.js`, `docs/internal/SLICE_STRESS_REPLAY_BEDARFE_01_VERTRAG_UND_KOMPATIBILITAET.md`, `docs/internal/SLICE_STRESS_REPLAY_BEDARFE_02_EDITOR_UND_EXPERTENFELDER.md`, `docs/internal/SLICE_STRESS_REPLAY_BEDARFE_03_DURCHSTICH_UND_DOKUMENTATION.md`, `docs/internal/slice-stress-replay-floor-flex-mindestflex-bugfix-arbeitsplan-01-whitelist-v2-patchanwendung-und-legacy-kompatibilitat.md`, `docs/internal/slice-stress-replay-floor-flex-mindestflex-bugfix-arbeitsplan-02-fokussierter-editor-und-expertenfelder.md`, `docs/internal/slice-stress-replay-floor-flex-mindestflex-bugfix-arbeitsplan-03-echter-replay-durchstich-dokumentation-und-abschlussgates.md`, `docs/internal/stress-replay-floor-flex-mindestflex-bugfix-implement-review-b005c9c6.md`, `docs/reference/SIMULATOR_MODULES_README.md`, `docs/reference/TECHNICAL.md`, `simulator.css`, `tests/README.md`, `tests/browser-smoke.test.mjs`, `tests/fixtures/stress-replay-comparison-export-v1.json`, `tests/stress-replay-contract.test.mjs`, `tests/stress-replay-e2e.test.mjs`, `tests/stress-replay-export.test.mjs`, `tests/stress-replay-persistence.test.mjs`, `tests/stress-replay-renderer.test.mjs`, `tests/stress-replay-runner.test.mjs`, `tests/stress-replay-ui.test.mjs`, `tests/stress-replay-variant.test.mjs`

- Teständerungsfreigabe: nicht erfasst.
- Pre-Mortems: keine erfasst.

#### Work Unit 02 – Slice 01

- Auftrag: Whitelist V2, Patchanwendung und Legacy-Kompatibilität
- Scope: `app/simulator/stress-replay-contract.js`, `app/simulator/stress-replay-export.js`, `app/simulator/stress-replay-persistence.js`, `app/simulator/stress-replay-runner.js`, `app/simulator/stress-replay-variant.js`, `docs/internal/SLICE_STRESS_REPLAY_BEDARFE_01_VERTRAG_UND_KOMPATIBILITAET.md`, `docs/internal/slice-stress-replay-floor-flex-mindestflex-bugfix-arbeitsplan-01-whitelist-v2-patchanwendung-und-legacy-kompatibilitat.md`, `docs/internal/stress-replay-floor-flex-mindestflex-bugfix-implement-review-b005c9c6.md`, `tests/fixtures/stress-replay-comparison-export-v1.json`, `tests/stress-replay-contract.test.mjs`, `tests/stress-replay-export.test.mjs`, `tests/stress-replay-persistence.test.mjs`, `tests/stress-replay-runner.test.mjs`, `tests/stress-replay-variant.test.mjs`

- Teständerungsfreigabe: nicht erfasst.
- Pre-Mortems:
  - Ereignis 2: Most likely three-month failure: a user or an imported legacy scenario has (or drifts into) &#96;minimumFlexAnnual &gt; startFlexBedarf&#96; in their live main-app inputs; the stress-replay baseline variant creation then throws &#96;STRESS_REPLAY_MINIMUM_FLEX_EXCEEDS_FLEX&#96; with no UI-level explanation yet (Slice 2/3 not merged at review time), producing what looks like a broken feature rather than a data-quality gate, and support has to trace the failure back to this contract-level invariant introduced here.
  - Ereignis 3: Downstream UI components or future API consumers construct partial V2 need patches without supplying the full baseline context or omit pre-submission validation of &#96;minimumFlexAnnual &lt;= startFlexBedarf&#96;, resulting in abrupt contract-level errors rather than inline UI validation feedback.

#### Work Unit 03 – Slice 02

- Auftrag: Fokussierter Editor und Expertenfelder
- Scope: `Simulator.html`, `app/simulator/stress-replay-renderer.js`, `app/simulator/stress-replay-ui.js`, `docs/internal/SLICE_STRESS_REPLAY_BEDARFE_02_EDITOR_UND_EXPERTENFELDER.md`, `docs/internal/slice-stress-replay-floor-flex-mindestflex-bugfix-arbeitsplan-02-fokussierter-editor-und-expertenfelder.md`, `docs/internal/stress-replay-floor-flex-mindestflex-bugfix-implement-review-b005c9c6.md`, `simulator.css`, `tests/browser-smoke.test.mjs`, `tests/stress-replay-renderer.test.mjs`, `tests/stress-replay-ui.test.mjs`

- Teständerungsfreigabe: nicht erfasst.
- Pre-Mortems:
  - Ereignis 2: Most likely three-month failure is that a later Slice/contract change alters the &#96;details&#96; key names or the effective-value semantics of &#96;STRESS_REPLAY_MINIMUM_FLEX_EXCEEDS_FLEX&#96; in stress-replay-contract.js, silently degrading the Mindest-Flex error message to "unbekannt" amounts in production, because this Slice's only test for that mapping is a synthetic mock rather than the real contract path (C-02), and this would ship past both this Slice's tests and generic full-suite runs unless a dedicated end-to-end assertion is added in Slice 3.
  - Ereignis 3: Most likely failure cause in three months is that future contract adjustments to error payloads in stress-replay-contract.js drift from the UI error formatter expectation without failing unit tests due to synthetic mock error payloads in stress-replay-ui.test.mjs, causing production error announcements to display fallback 'unbekannt' values until caught in end-to-end browser tests.
<!-- audit:test-approval-premortem:end -->

### Findings-Lebenszyklus

<!-- audit:findings:begin -->
#### Work Unit 01 – Planung

- Auftrag: Planung und Review der geordneten Implementierungsslices
- Scope: `Handbuch.html`, `README.md`, `Simulator.html`, `app/simulator/stress-replay-contract.js`, `app/simulator/stress-replay-export.js`, `app/simulator/stress-replay-persistence.js`, `app/simulator/stress-replay-renderer.js`, `app/simulator/stress-replay-runner.js`, `app/simulator/stress-replay-ui.js`, `app/simulator/stress-replay-variant.js`, `docs/internal/SLICE_STRESS_REPLAY_BEDARFE_01_VERTRAG_UND_KOMPATIBILITAET.md`, `docs/internal/SLICE_STRESS_REPLAY_BEDARFE_02_EDITOR_UND_EXPERTENFELDER.md`, `docs/internal/SLICE_STRESS_REPLAY_BEDARFE_03_DURCHSTICH_UND_DOKUMENTATION.md`, `docs/internal/slice-stress-replay-floor-flex-mindestflex-bugfix-arbeitsplan-01-whitelist-v2-patchanwendung-und-legacy-kompatibilitat.md`, `docs/internal/slice-stress-replay-floor-flex-mindestflex-bugfix-arbeitsplan-02-fokussierter-editor-und-expertenfelder.md`, `docs/internal/slice-stress-replay-floor-flex-mindestflex-bugfix-arbeitsplan-03-echter-replay-durchstich-dokumentation-und-abschlussgates.md`, `docs/internal/stress-replay-floor-flex-mindestflex-bugfix-implement-review-b005c9c6.md`, `docs/reference/SIMULATOR_MODULES_README.md`, `docs/reference/TECHNICAL.md`, `simulator.css`, `tests/README.md`, `tests/browser-smoke.test.mjs`, `tests/fixtures/stress-replay-comparison-export-v1.json`, `tests/stress-replay-contract.test.mjs`, `tests/stress-replay-e2e.test.mjs`, `tests/stress-replay-export.test.mjs`, `tests/stress-replay-persistence.test.mjs`, `tests/stress-replay-renderer.test.mjs`, `tests/stress-replay-runner.test.mjs`, `tests/stress-replay-ui.test.mjs`, `tests/stress-replay-variant.test.mjs`

Noch keine strukturierten Findings.

#### Work Unit 02 – Slice 01

- Auftrag: Whitelist V2, Patchanwendung und Legacy-Kompatibilität
- Scope: `app/simulator/stress-replay-contract.js`, `app/simulator/stress-replay-export.js`, `app/simulator/stress-replay-persistence.js`, `app/simulator/stress-replay-runner.js`, `app/simulator/stress-replay-variant.js`, `docs/internal/SLICE_STRESS_REPLAY_BEDARFE_01_VERTRAG_UND_KOMPATIBILITAET.md`, `docs/internal/slice-stress-replay-floor-flex-mindestflex-bugfix-arbeitsplan-01-whitelist-v2-patchanwendung-und-legacy-kompatibilitat.md`, `docs/internal/stress-replay-floor-flex-mindestflex-bugfix-implement-review-b005c9c6.md`, `tests/fixtures/stress-replay-comparison-export-v1.json`, `tests/stress-replay-contract.test.mjs`, `tests/stress-replay-export.test.mjs`, `tests/stress-replay-persistence.test.mjs`, `tests/stress-replay-runner.test.mjs`, `tests/stress-replay-variant.test.mjs`

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

#### Work Unit 03 – Slice 02

- Auftrag: Fokussierter Editor und Expertenfelder
- Scope: `Simulator.html`, `app/simulator/stress-replay-renderer.js`, `app/simulator/stress-replay-ui.js`, `docs/internal/SLICE_STRESS_REPLAY_BEDARFE_02_EDITOR_UND_EXPERTENFELDER.md`, `docs/internal/slice-stress-replay-floor-flex-mindestflex-bugfix-arbeitsplan-02-fokussierter-editor-und-expertenfelder.md`, `docs/internal/stress-replay-floor-flex-mindestflex-bugfix-implement-review-b005c9c6.md`, `simulator.css`, `tests/browser-smoke.test.mjs`, `tests/stress-replay-renderer.test.mjs`, `tests/stress-replay-ui.test.mjs`

### `C-01` — `OPEN`

- Quelle: `claude`; Runde 1
- Klasse: `OBSERVATION`
- Finding: In &#96;previewEditorPatch&#96;, the &#96;region.dataset.patchError&#96; sentinel is only ever written/cleared for the single code &#96;STRESS_REPLAY_MINIMUM_FLEX_EXCEEDS_FLEX&#96;. If the preview transitions from that error to a *different* validation error and back to success, the stale sentinel from the first error would still be read as &#96;true&#96; on the eventual success path, triggering the "Die Patchvorschau ist zulässig." announcement while never having explicitly announced the second, different error through this same code path. No test in this Slice exercises an error-type transition (only the single-error and pure-toggle cases are covered), so this edge-case status/aria-live regression would not be caught by regression tests.
- Akzeptanztest: Add a stress-replay-ui.test.mjs case that first triggers &#96;STRESS_REPLAY_MINIMUM_FLEX_EXCEEDS_FLEX&#96;, then triggers an unrelated preview error (e.g. a whitelist/schema rejection), and finally a successful preview, asserting the status text/dataset.status reflect only the current error at each step and that the "zulässig" announcement fires exactly once, only after the truly last error was cleared.
- Statusbegründung: –

### `C-02` — `OPEN`

- Quelle: `claude`; Runde 1
- Klasse: `OBSERVATION`
- Finding: &#96;formatStressReplayUiError&#96;'s new branch depends on &#96;error.details.{minimumFlexAnnual,startFlexBedarf}&#96; being produced exactly this way by Slice 1's contract validator (&#96;app/simulator/stress-replay-contract.js&#96;, out of this Slice's scope). This Slice's only coverage of that mapping (Test 11 in tests/stress-replay-ui.test.mjs) constructs a hand-rolled mock error rather than invoking the real contract function, and no browser-smoke/e2e assertion in this packet exercises the real end-to-end error text. A future rename or restructuring of the real error's &#96;details&#96; shape in Slice 1/3 would silently break the German message (fields would render as &#96;undefined&#96;/&#96;unbekannt&#96;) without failing any test owned by this Slice.
- Akzeptanztest: Add an integration-level assertion (either importing the real &#96;applyStressReplayVariantPatch&#96;/validator from stress-replay-contract.js in a unit test, or an e2e assertion in tests/stress-replay-e2e.test.mjs in Slice 3) that triggers the genuine &#96;STRESS_REPLAY_MINIMUM_FLEX_EXCEEDS_FLEX&#96; error and asserts &#96;formatStressReplayUiError&#96; produces the expected German text with correct amounts.
- Statusbegründung: –
<!-- audit:findings:end -->

### Entscheidungstabelle

<!-- audit:decision-table:begin -->
#### Work Unit 01 – Planung

- Auftrag: Planung und Review der geordneten Implementierungsslices
- Scope: `Handbuch.html`, `README.md`, `Simulator.html`, `app/simulator/stress-replay-contract.js`, `app/simulator/stress-replay-export.js`, `app/simulator/stress-replay-persistence.js`, `app/simulator/stress-replay-renderer.js`, `app/simulator/stress-replay-runner.js`, `app/simulator/stress-replay-ui.js`, `app/simulator/stress-replay-variant.js`, `docs/internal/SLICE_STRESS_REPLAY_BEDARFE_01_VERTRAG_UND_KOMPATIBILITAET.md`, `docs/internal/SLICE_STRESS_REPLAY_BEDARFE_02_EDITOR_UND_EXPERTENFELDER.md`, `docs/internal/SLICE_STRESS_REPLAY_BEDARFE_03_DURCHSTICH_UND_DOKUMENTATION.md`, `docs/internal/slice-stress-replay-floor-flex-mindestflex-bugfix-arbeitsplan-01-whitelist-v2-patchanwendung-und-legacy-kompatibilitat.md`, `docs/internal/slice-stress-replay-floor-flex-mindestflex-bugfix-arbeitsplan-02-fokussierter-editor-und-expertenfelder.md`, `docs/internal/slice-stress-replay-floor-flex-mindestflex-bugfix-arbeitsplan-03-echter-replay-durchstich-dokumentation-und-abschlussgates.md`, `docs/internal/stress-replay-floor-flex-mindestflex-bugfix-implement-review-b005c9c6.md`, `docs/reference/SIMULATOR_MODULES_README.md`, `docs/reference/TECHNICAL.md`, `simulator.css`, `tests/README.md`, `tests/browser-smoke.test.mjs`, `tests/fixtures/stress-replay-comparison-export-v1.json`, `tests/stress-replay-contract.test.mjs`, `tests/stress-replay-e2e.test.mjs`, `tests/stress-replay-export.test.mjs`, `tests/stress-replay-persistence.test.mjs`, `tests/stress-replay-renderer.test.mjs`, `tests/stress-replay-runner.test.mjs`, `tests/stress-replay-ui.test.mjs`, `tests/stress-replay-variant.test.mjs`

| ID | Quelle | Finding | Klasse | Entscheidung | Umsetzung |
|---|---|---|---|---|---|
| – | – | Noch keine Findings | – | – | – |

#### Work Unit 02 – Slice 01

- Auftrag: Whitelist V2, Patchanwendung und Legacy-Kompatibilität
- Scope: `app/simulator/stress-replay-contract.js`, `app/simulator/stress-replay-export.js`, `app/simulator/stress-replay-persistence.js`, `app/simulator/stress-replay-runner.js`, `app/simulator/stress-replay-variant.js`, `docs/internal/SLICE_STRESS_REPLAY_BEDARFE_01_VERTRAG_UND_KOMPATIBILITAET.md`, `docs/internal/slice-stress-replay-floor-flex-mindestflex-bugfix-arbeitsplan-01-whitelist-v2-patchanwendung-und-legacy-kompatibilitat.md`, `docs/internal/stress-replay-floor-flex-mindestflex-bugfix-implement-review-b005c9c6.md`, `tests/fixtures/stress-replay-comparison-export-v1.json`, `tests/stress-replay-contract.test.mjs`, `tests/stress-replay-export.test.mjs`, `tests/stress-replay-persistence.test.mjs`, `tests/stress-replay-runner.test.mjs`, `tests/stress-replay-variant.test.mjs`

| ID | Quelle | Finding | Klasse | Entscheidung | Umsetzung |
|---|---|---|---|---|---|
| C-01 | claude | The unconditional effective-needs relation check in &#96;applyStressReplayVariantPatch&#96;/&#96;validateStressReplayEffectiveNeeds&#96; means a baseline whose live inputs already violate &#96;minimumFlexAnnual &lt;= startFlexBedarf&#96; blocks creation of the mandatory baseline variant itself (patch &#96;{}&#96;) and any unrelated alternative patch, not just needs-editing patches. No test in this slice exercises &#96;createStressReplayBaselineVariantV1&#96; or an unrelated non-needs patch against such an invalid baseline to confirm/document this is the intended fail-closed contract rather than an accidental over-broad check; Slice 2/3 (editor, real replay) must be aware they may hit this before ever letting a user edit needs. | OBSERVATION | offen | offen |
| C-02 | claude | &#96;STRESS_REPLAY_FORBIDDEN_VARIANT_PATHS_V2&#96; is derived by filtering only &#96;strategy.minimumFlexAnnual&#96; out of the V1 forbidden list; if &#96;strategy.startFloorBedarf&#96;/&#96;strategy.startFlexBedarf&#96; were already present in &#96;STRESS_REPLAY_FORBIDDEN_VARIANT_PATHS_V1&#96; (plausible, since the slice doc states V2 "adds exactly Floor, Flex and Mindest-Flex" as newly patchable), the exported V2 forbidden-list constant would still list two fields that are in fact whitelisted and patchable under V2. This constant isn't consumed by the normalization/apply logic itself (which checks the whitelist map, not this list), so it is not a correctness bug in this slice, but it is public API that Slice 2's editor could plausibly use to decide which fields to lock, and no test asserts the V2 list's completeness beyond the single minimumFlexAnnual exclusion. | OBSERVATION | offen | offen |

#### Work Unit 03 – Slice 02

- Auftrag: Fokussierter Editor und Expertenfelder
- Scope: `Simulator.html`, `app/simulator/stress-replay-renderer.js`, `app/simulator/stress-replay-ui.js`, `docs/internal/SLICE_STRESS_REPLAY_BEDARFE_02_EDITOR_UND_EXPERTENFELDER.md`, `docs/internal/slice-stress-replay-floor-flex-mindestflex-bugfix-arbeitsplan-02-fokussierter-editor-und-expertenfelder.md`, `docs/internal/stress-replay-floor-flex-mindestflex-bugfix-implement-review-b005c9c6.md`, `simulator.css`, `tests/browser-smoke.test.mjs`, `tests/stress-replay-renderer.test.mjs`, `tests/stress-replay-ui.test.mjs`

| ID | Quelle | Finding | Klasse | Entscheidung | Umsetzung |
|---|---|---|---|---|---|
| C-01 | claude | In &#96;previewEditorPatch&#96;, the &#96;region.dataset.patchError&#96; sentinel is only ever written/cleared for the single code &#96;STRESS_REPLAY_MINIMUM_FLEX_EXCEEDS_FLEX&#96;. If the preview transitions from that error to a *different* validation error and back to success, the stale sentinel from the first error would still be read as &#96;true&#96; on the eventual success path, triggering the "Die Patchvorschau ist zulässig." announcement while never having explicitly announced the second, different error through this same code path. No test in this Slice exercises an error-type transition (only the single-error and pure-toggle cases are covered), so this edge-case status/aria-live regression would not be caught by regression tests. | OBSERVATION | offen | offen |
| C-02 | claude | &#96;formatStressReplayUiError&#96;'s new branch depends on &#96;error.details.{minimumFlexAnnual,startFlexBedarf}&#96; being produced exactly this way by Slice 1's contract validator (&#96;app/simulator/stress-replay-contract.js&#96;, out of this Slice's scope). This Slice's only coverage of that mapping (Test 11 in tests/stress-replay-ui.test.mjs) constructs a hand-rolled mock error rather than invoking the real contract function, and no browser-smoke/e2e assertion in this packet exercises the real end-to-end error text. A future rename or restructuring of the real error's &#96;details&#96; shape in Slice 1/3 would silently break the German message (fields would render as &#96;undefined&#96;/&#96;unbekannt&#96;) without failing any test owned by this Slice. | OBSERVATION | offen | offen |
<!-- audit:decision-table:end -->

### Freigabestatus

<!-- audit:approval-status:begin -->
#### Work Unit 01 – Planung

- Auftrag: Planung und Review der geordneten Implementierungsslices
- Scope: `Handbuch.html`, `README.md`, `Simulator.html`, `app/simulator/stress-replay-contract.js`, `app/simulator/stress-replay-export.js`, `app/simulator/stress-replay-persistence.js`, `app/simulator/stress-replay-renderer.js`, `app/simulator/stress-replay-runner.js`, `app/simulator/stress-replay-ui.js`, `app/simulator/stress-replay-variant.js`, `docs/internal/SLICE_STRESS_REPLAY_BEDARFE_01_VERTRAG_UND_KOMPATIBILITAET.md`, `docs/internal/SLICE_STRESS_REPLAY_BEDARFE_02_EDITOR_UND_EXPERTENFELDER.md`, `docs/internal/SLICE_STRESS_REPLAY_BEDARFE_03_DURCHSTICH_UND_DOKUMENTATION.md`, `docs/internal/slice-stress-replay-floor-flex-mindestflex-bugfix-arbeitsplan-01-whitelist-v2-patchanwendung-und-legacy-kompatibilitat.md`, `docs/internal/slice-stress-replay-floor-flex-mindestflex-bugfix-arbeitsplan-02-fokussierter-editor-und-expertenfelder.md`, `docs/internal/slice-stress-replay-floor-flex-mindestflex-bugfix-arbeitsplan-03-echter-replay-durchstich-dokumentation-und-abschlussgates.md`, `docs/internal/stress-replay-floor-flex-mindestflex-bugfix-implement-review-b005c9c6.md`, `docs/reference/SIMULATOR_MODULES_README.md`, `docs/reference/TECHNICAL.md`, `simulator.css`, `tests/README.md`, `tests/browser-smoke.test.mjs`, `tests/fixtures/stress-replay-comparison-export-v1.json`, `tests/stress-replay-contract.test.mjs`, `tests/stress-replay-e2e.test.mjs`, `tests/stress-replay-export.test.mjs`, `tests/stress-replay-persistence.test.mjs`, `tests/stress-replay-renderer.test.mjs`, `tests/stress-replay-runner.test.mjs`, `tests/stress-replay-ui.test.mjs`, `tests/stress-replay-variant.test.mjs`

- Implementierung bereit: `NOT_RECORDED`
- Validierung: `NOT_RECORDED`
- Claude-Freigabe: `NOT_RECORDED`
- Antigravity-Freigabe: `NOT_RECORDED`
- Red-State-Folgeslice: `NONE`
- Commit autorisiert: `NO`

#### Work Unit 02 – Slice 01

- Auftrag: Whitelist V2, Patchanwendung und Legacy-Kompatibilität
- Scope: `app/simulator/stress-replay-contract.js`, `app/simulator/stress-replay-export.js`, `app/simulator/stress-replay-persistence.js`, `app/simulator/stress-replay-runner.js`, `app/simulator/stress-replay-variant.js`, `docs/internal/SLICE_STRESS_REPLAY_BEDARFE_01_VERTRAG_UND_KOMPATIBILITAET.md`, `docs/internal/slice-stress-replay-floor-flex-mindestflex-bugfix-arbeitsplan-01-whitelist-v2-patchanwendung-und-legacy-kompatibilitat.md`, `docs/internal/stress-replay-floor-flex-mindestflex-bugfix-implement-review-b005c9c6.md`, `tests/fixtures/stress-replay-comparison-export-v1.json`, `tests/stress-replay-contract.test.mjs`, `tests/stress-replay-export.test.mjs`, `tests/stress-replay-persistence.test.mjs`, `tests/stress-replay-runner.test.mjs`, `tests/stress-replay-variant.test.mjs`

- Implementierung bereit: `YES`
- Validierung: `PASS`
- Claude-Freigabe: `YES`
- Antigravity-Freigabe: `YES`
- Red-State-Folgeslice: `NONE`
- Commit autorisiert: `YES`

#### Work Unit 03 – Slice 02

- Auftrag: Fokussierter Editor und Expertenfelder
- Scope: `Simulator.html`, `app/simulator/stress-replay-renderer.js`, `app/simulator/stress-replay-ui.js`, `docs/internal/SLICE_STRESS_REPLAY_BEDARFE_02_EDITOR_UND_EXPERTENFELDER.md`, `docs/internal/slice-stress-replay-floor-flex-mindestflex-bugfix-arbeitsplan-02-fokussierter-editor-und-expertenfelder.md`, `docs/internal/stress-replay-floor-flex-mindestflex-bugfix-implement-review-b005c9c6.md`, `simulator.css`, `tests/browser-smoke.test.mjs`, `tests/stress-replay-renderer.test.mjs`, `tests/stress-replay-ui.test.mjs`

- Implementierung bereit: `YES`
- Validierung: `PASS`
- Claude-Freigabe: `YES`
- Antigravity-Freigabe: `YES`
- Red-State-Folgeslice: `NONE`
- Commit autorisiert: `YES`
<!-- audit:approval-status:end -->
