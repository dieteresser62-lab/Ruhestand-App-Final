# Slice 01 – Contracts, Whitelist und Determinismusorakel

**Feature-Branch:** `codex/stress-pfad-replay`
**GitHub-Status:** nur lokal

## Ziel des Slice

Contracts, Whitelist und Determinismusorakel

## Akzeptanzkriterien

Siehe freigegebenen Arbeitsplan.

## Scope und Nicht-Scope

Erlaubter Scope: `app/simulator/stress-replay-contract.js`, `docs/internal/slice-stress-pfad-replay-arbeitsplan-01-contracts-whitelist-und-determinismusorakel.md`, `docs/internal/slice-stress-replay-implement-01-contracts-whitelist-und-determinismusorakel.md`, `docs/internal/stress-replay-implement-review-fa2904b2.md`, `tests/stress-replay-contract.test.mjs`

## Diff-Risiko inklusive Branch- und Statuscheck

- Branch vor Umsetzung: `codex/stress-pfad-replay`.
- Baseline vor Umsetzung: `dfd2001b2cb141e1d9fcdd9b58ede413aac4cfe5`.
- Status vor Umsetzung: ausschließlich die vom Orchestrator angelegten,
  unversionierten Berichte für diesen Implementierungslauf; keine fremde
  Änderung im Slice-Scope.
- Diff-Risiko: neue, von Folgeslices konsumierte Contractoberfläche. Besonders
  riskant sind unvollständige Fingerprintprojektionen, still normalisierte
  Zahlenwerte und ein versehentliches Durchlassen von Assetfeldern.

## Geplante Tests

Gemäß Arbeitsplan und Orchestrator-Validierungsmatrix.

## Durchgeführte Änderungen

- Versionen, Einheiten, Größenlimits und Fehlercodes für Pfad, Varianten,
  Ergebnisse, Vergleiche und Export definiert.
- Exakte 17-Pfad-Whitelist aus den realen `getCommonInputs()`-Rückgabepfaden
  sowie eine explizite Negativliste für Asset-, Flex-Budget- und
  Optimizer-Aliasfelder ergänzt.
- Fail-closed Patchnormalisierung mit modusabhängigen Unterfeldern ohne
  stilles Clamping implementiert; inaktive nullable Unterfelder werden vor
  ihrer Zahlenvalidierung entfernt.
- Kanonische SHA-256-Fingerprints, Nicht-Finite-/Zyklusprüfung,
  Größenprüfung, Pfadvalidierung und tiefe Immutabilität implementiert.
- Die `ScenarioLogExportV2`-Terminaltypen, die festgelegte Tie-Break-Regel und
  die ausgeschriebenen Pfadeinheiten werden im Contract exakt validiert.
- Contracttests für Minimal-/Maximalwerte, Indexbasis, Einheiten,
  Startmarkthistorie, Längenfehler, verbotene Felder, Bedingungslogik,
  Fingerprints, Immutabilität und Größenlimits ergänzt.

## Ausgeführte Validierung mit Ergebnis

- Implementer-Plausibilisierung: `node tests/run-single.mjs
  tests/stress-replay-contract.test.mjs` mit 47/47 bestandenen Assertions.
- Syntaxprüfung: `node --check app/simulator/stress-replay-contract.js` und
  `node --check tests/stress-replay-contract.test.mjs` ohne Befund.
- Die deterministische Gesamtvalidierung und Attestierung verbleibt beim
  Orchestrator.

## Abweichungen vom Plan

Keine.

## Offene Risiken

- Die konkreten Jahresdatensätze und Ergebnisobjekte werden erst in den
  Folgeslices materialisiert. Deren Konstruktoren müssen die hier definierten
  Versionen, Einheiten und Fingerprintgrenzen unverändert konsumieren.

## Review-Feedback von Claude

<!-- audit:claude-review:begin -->
### Ereignis 2: Runde 1

- Reviewer: `claude`
- Freigabe: `YES`
- Validierungsbindung: `validation-e37571899cf7`
- Testdateien: `tests/stress-replay-contract.test.mjs`
- Prüfdimensionen: checked whitelist fail-closed enforcement, conditional-subfield normalization without clamping, fingerprint exclusion/canonicalization determinism, path schema invariants (index basis, length reconciliation, terminal-status/evaluability coupling, RNG mode restriction), size-limit boundary exactness, deep immutability and cycle safety, and scope/path conformance against the approved slice allowlist
- Größtes Restrisiko: Largest residual risk is the unbounded maxSkimPctOfEq/maxBearRefillPctOfEq whitelist entries (C-01) plus the name-based (not path-based) fingerprint exclusion generality
- Realistische Bruchbedingung: Break condition: a future slice or an import/editor path constructs a StressReplayVariantV1 patch with a negative or extreme maxSkimPctOfEq/maxBearRefillPctOfEq that passes this contract unchanged and is then fed into simulator-engine-direct.js/simulator-forced-sale.js, producing NaN, negative-cash, or otherwise physically nonsensical replay output that this contract layer was supposed to prevent.
- Eigene Findings: `C-01`
<!-- audit:claude-review:end -->

## Review-Feedback von Antigravity

<!-- audit:antigravity-review:begin -->
### Ereignis 3: Runde 1

- Reviewer: `antigravity`
- Freigabe: `YES`
- Validierungsbindung: `validation-e37571899cf7`
- Testdateien: `tests/stress-replay-contract.test.mjs`
- Prüfdimensionen: whitelist fail-closed enforcement and forbidden path rejection, conditional mode subfield normalization without silent clamping, cycle detection and deep freeze immutability, canonical JSON SHA-256 fingerprinting with metadata exclusions, strict path schema validation (0-based vs 1-based run indexing, terminal-status/evaluability coupling, RNG mode constraint), size limit checks, and slice path scope compliance
- Größtes Restrisiko: Unbounded percentage domain for maxSkimPctOfEq and maxBearRefillPctOfEq (tracked in C-01) permitting out-of-range variant patches to pass the contract layer
- Realistische Bruchbedingung: A variant patch or import payload supplying negative or extreme percentages for maxSkimPctOfEq or maxBearRefillPctOfEq passes validation under finite_number and causes non-physical cash-flow or refill behavior in the single-path runner engine in Slice 4
- Eigene Findings: keine
<!-- audit:antigravity-review:end -->

## Review-Antworten von Codex

<!-- audit:codex-responses:begin -->
Noch keine strukturierten Codex-Antworten.
<!-- audit:codex-responses:end -->

## Validierungsattestierung

<!-- audit:validation-attestation:begin -->
### Ereignis 1: `validation-e37571899cf7`

- Diff-Fingerprint: `e37571899cf71cfed4ec51eacdaa6c5b8b8985b7a28ae9c4c7e00bebf5e76736`
- Status: `PASS`
- Vollständig: `YES`
- Kurzresultat: 1 passed; 0 failed; 0 unavailable; 1 required
- Ausgabedigest: `0ea6caddae8cbd38e9b5ad859f9aca0226f73bb2bb296d7ea942b5f46faaffe6`

| Matrixbefehl | Status | Exitcode | Kompaktausgabe |
|---|---|---:|---|
| shell: npm test | PASS | 0 | &gt; ruhestand-app-final@1.0.0 test<br>&gt; node tests/run-tests.mjs<br><br>🚀 Starting Test Runner...<br>Found 170 test files.<br><br>📂 Running 3bucket-config.test.mjs in process...<br>--- 3-Bucket Config Tests ---<br>✅ 3-Bucket config tests passed<br>✅ 3bucket-config.test.mjs completed.<br>📊 FILE RESULT: 3bucket-config.test.mjs &#124; mode=in-process &#124; assertions=17 &#124; passed=17 &#124; failedAssertions=0 &#124; failedFiles=0<br><br>📂 Running 3bucket-refill.test.mjs in process...<br>--- 3-Bucket Refill Tests ---<br>✅ 3-Bucket refill tests passed<br>✅ 3bucket-refill.test.mjs completed.<br>📊 FILE RESULT: 3bucket-refill.test.mjs &#124; mode=in-process &#124; assertions=32 &#124; passed=32 &#124; failedAssertions=0 &#124; failedFiles=0<br><br>📂 Running architecture-evidence.test.mjs in process...<br>--- Architecture Evidence Contract Tests ---<br>✅ Architecture evidence contract tests passed<br>✅ architecture-evidence.test.mjs completed.<br>📊 FILE RESULT: architecture-evidence.test.mjs &#124; mode=in-process &#124; assertions=24 &#124; passed=24 &#124; failedAssertions=0 &#124; failedFiles=0<br><br>📂 Running auto-optimize-fidelity<br>...[175064 characters omitted]...<br>ete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/app/profile/profile-storage.js:537:28)<br>    at initProfileSubpageLifecycle (file:///mnt/c/Users/Diete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/app/profile/profile-navigation.js:157:5)<br>    at initProfileBridge (file:///mnt/c/Users/Diete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/app/profile/profile-bridge.js:8:5)<br>    at async Promise.all (index 0)<br>    at async MockDocument.dispatch (file:///mnt/c/Users/Diete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/tests/profile-ui-contract.test.mjs:80:9)<br>    at async runProfileUiContractTests (file:///mnt/c/Users/Diete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/tests/profile-ui-contract.test.mjs:244:9)<br>    at async file:///mnt/c/Users/Diete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/tests/profile-ui-contract.test.mjs:257:9<br>[VALIDATION ERROR] Invalid input fields: [<br>  {<br>    fieldId: 'goGoMultiplier',<br>    message: 'goGoMultiplier muss zwischen 1.0 und 1.5 liegen.'<br>  }<br>] |
<!-- audit:validation-attestation:end -->

## Testfreigabe und Pre-Mortem

<!-- audit:test-approval-premortem:begin -->
- Teständerungsfreigabe: nicht erfasst.
- Pre-Mortems:
  - Ereignis 2: Three months from now, the most likely failure is that a later slice (variant editor or import) trusts this contract as the sole numeric gate, forgets that maxSkimPctOfEq/maxBearRefillPctOfEq are unbounded here, and a malformed or adversarial import silently produces an out-of-domain skim/refill percentage that only surfaces as a confusing NaN or nonsensical replay result deep in the engine rather than as a clear STRESS_REPLAY_VARIANT_VALUE_INVALID at the contract boundary.
  - Ereignis 3: In three months, the most likely failure cause would be future strategy parameters added to the main simulator input schema that are omitted from STRESS_REPLAY_VARIANT_WHITELIST_V1, causing them to be silently dropped during variant snapshot creation or causing false-positive STRESS_REPLAY_VARIANT_FIELD_FORBIDDEN errors when comparing baseline strategies.
<!-- audit:test-approval-premortem:end -->

## Findings-Lebenszyklus

<!-- audit:findings:begin -->
### `C-01` — `OPEN`

- Quelle: `claude`; Runde 1
- Klasse: `OBSERVATION`
- Finding: STRESS_REPLAY_VARIANT_WHITELIST_V1 entries for maxSkimPctOfEq and maxBearRefillPctOfEq have type 'finite_number' with no minimum/maximum, unlike all other percentage-domain fields in the same whitelist, so the contract currently accepts negative or unbounded skim/refill percentages into a variant patch.
- Akzeptanztest: Before Slice 4 (Strategievarianten) or Slice 7 (Persistenz/Import) is approved, add a whitelist bound (e.g. minimum 0, a documented maximum) for both fields and a corresponding assertContractError case in tests/stress-replay-variant.test.mjs (or stress-replay-contract.test.mjs) proving out-of-domain values are rejected fail-closed the same way goGoMultiplier already is; alternatively, if the plan intentionally leaves these unbounded, require an explicit written rationale in the arbeitsplan risk section.
- Statusbegründung: –
<!-- audit:findings:end -->

## Entscheidungstabelle

<!-- audit:decision-table:begin -->
| ID | Quelle | Finding | Klasse | Entscheidung | Umsetzung |
|---|---|---|---|---|---|
| C-01 | claude | STRESS_REPLAY_VARIANT_WHITELIST_V1 entries for maxSkimPctOfEq and maxBearRefillPctOfEq have type 'finite_number' with no minimum/maximum, unlike all other percentage-domain fields in the same whitelist, so the contract currently accepts negative or unbounded skim/refill percentages into a variant patch. | OBSERVATION | offen | offen |
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
