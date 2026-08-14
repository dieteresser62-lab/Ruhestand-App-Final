# Slice 05 – Informationsarchitektur, Konsistenz und Endvalidierung

**Feature-Branch:** `codex/handbuch-ueberarbeitung`
**GitHub-Status:** nur lokal

## Ziel des Slice

Informationsarchitektur, Konsistenz und Endvalidierung

## Akzeptanzkriterien

- Alle fünf Nutzeroberflächen und zentralen Workflows sind über das Inhaltsverzeichnis auffindbar.
- Interne Hashlinks besitzen eindeutige Ziele; Tabwechsel hinterlassen genau einen aktiven Tab.
- Quickstart, Detailkapitel, Problemhilfe, Jahrespflege, FAQ und Glossar verwenden dieselben Begriffe und Grenzen.
- Unbelegte Support-, Cloud-Sync-, Plattform- oder Modellfreigabeaussagen sind entfernt.
- Die Darstellung schützt bei 390 Pixel Breite vor Seitenoverflow und unlesbaren breiten Inhalten.
- Die bestehenden automatisierten Gates bleiben ohne Teständerung ausführbar.

## Scope und Nicht-Scope

Erlaubter Scope: `Handbuch.html`, `docs/internal/slice-handbuch-05-informationsarchitektur-konsistenz-und-endvalidierung.md`

Nicht-Scope: Produktivlogik, Engine-Semantik, Datenverträge, UI-Labels anderer Oberflächen, Assets,
Tests, Referenzdokumente, Build- und Release-Artefakte.

## Diff-Risiko inklusive Branch- und Statuscheck

**Branch vor Umsetzung:** `codex/handbuch-ueberarbeitung`

**Git-Status vor Umsetzung:**

```text
?? docs/internal/slice-handbuch-05-informationsarchitektur-konsistenz-und-endvalidierung.md
```

Geplante Dateien:
- `Handbuch.html`
- `docs/internal/slice-handbuch-05-informationsarchitektur-konsistenz-und-endvalidierung.md`

Voraussichtliche Änderungstiefe:
- mittel; Inhaltsverzeichnis, Querschnittstexte, responsive Inline-Styles und Inline-Navigation

Gefährdete bestehende Tests:
- Browser-Smoke für Laden und Tabzustand
- keine Testdatei wird geändert

Nicht anfassen:
- alle Pfade außerhalb des erlaubten Slice-Scope
- Produktlogik, Engine, Persistenz, Assets und generierte Artefakte

Rollback-Strategie:
- `git checkout -- Handbuch.html`
- neue Slice-Datei nur nach ausdrücklicher Freigabe entfernen

## Geplante Tests

- Statischer Check auf eindeutige IDs, auflösbare Hashlinks und vorhandene Bildquellen
- Statische Kontrolle externer Laufzeitressourcen und leerer Navigationsziele
- `git diff --check`, Branch-, Status- und Scopeprüfung
- Browser-Smoke, `npm run test:browser` und gegebenenfalls `npm test` durch den Orchestrator

## Durchgeführte Änderungen

- Inhaltsverzeichnis auf die Nutzerreise Start/Datensicherheit, Profile/Tranchen, Simulator,
  Balance und Hilfe/Begriffe ausgerichtet; fehlende Detailanker ergänzt.
- Überblick auf alle fünf Oberflächen erweitert.
- Unbelegte E-Mail-, Support-SLA-, Demo-, Quartals-, Backup-Redundanz-, Cache- und
  Defaultvorlagen-Aussagen entfernt oder auf belegte Produktgrenzen zurückgeführt.
- FAQ und Glossar auf kanonische Detailabschnitte verlinkt; Steuer- und Renditeaussagen als
  Modellgrenzen formuliert.
- Externe Schriftressourcen entfernt, Systemschrift-Fallback ergänzt und responsive Regeln für
  Karten, Grid, Tabellen, Code und Navigation ergänzt.
- Tabsemantik um ARIA-Zustände ergänzt; TOC-Sprünge übertragen den Tastaturfokus auf das Ziel.

## Ausgeführte Validierung mit Ergebnis

Codex führte nur statische Slice-Selbstprüfungen aus; die deterministische Validierungsmatrix und
ihre Attestierung gehören dem Orchestrator.

- Statischer HTML-/Ankercheck: `PASS` – 54 IDs, 54 eindeutige IDs, 64 interne Hashlinks,
  keine fehlenden oder leeren Ziele.
- Bildquellen: `PASS` – sechs referenzierte lokale SVG-Dateien vorhanden.
- Externe Laufzeitressourcen: `PASS` – keine externen `link`-, `script`- oder `img`-Ressourcen.
- Querschnittssuche: `PASS` – keine unbelegte E-Mail-/Drei-Werktage-Supportzusage sowie keine
  veralteten Demo-, Quartals-, Cache- oder Defaultvorlagen-Anweisungen verblieben.
- `git diff --check`: `PASS`.
- Branch-/Scopecheck: `PASS` – aktiver Branch `codex/handbuch-ueberarbeitung`; geändert sind nur
  `Handbuch.html` und diese Slice-Datei.
- Testdateien geändert: keine.
- Nicht durch Codex ausgeführt: Browser-Smoke, `npm run test:browser` und `npm test`; diese Gates
  und die Viewport-/Konsolenbestätigung sind gemäß Orchestratorvertrag ausstehend.

## Abweichungen vom Plan

Keine.

## Offene Risiken

- Die tatsächliche Darstellung bei 390 Pixel und Desktopbreite sowie die Browserkonsole müssen im
  vorgesehenen Browser-Smoke bestätigt werden.
- Künftige Inhaltsänderungen können erneut TOC-/Glossar-Dopplungen erzeugen; der statische
  Link-/ID-Check bleibt deshalb Teil der Endvalidierung.

## Review-Feedback von Claude

<!-- audit:claude-review:begin -->
### Ereignis 2: Runde 1

- Reviewer: `claude`
- Freigabe: `YES`
- Validierungsbindung: `validation-9b877e03889d`
- Testdateien: keine
- Eigene Findings: `C-01`
<!-- audit:claude-review:end -->

## Review-Feedback von Antigravity

<!-- audit:antigravity-review:begin -->
### Ereignis 3: Runde 1

- Reviewer: `antigravity`
- Freigabe: `YES`
- Validierungsbindung: `validation-9b877e03889d`
- Testdateien: keine
- Prüfdimensionen: Checked responsive CSS, accessibility additions, fallback logic, and TOC hierarchy changes.
- Größtes Restrisiko: Blank page when loading an invalid hash due to incomplete fallback logic.
- Realistische Bruchbedingung: User navigates to Handbuch.html#unknown, sees the 'Schnellstart' tab marked as active but the content remains hidden.
- Eigene Findings: `A-01`
<!-- audit:antigravity-review:end -->

## Review-Antworten von Codex

<!-- audit:codex-responses:begin -->
Noch keine strukturierten Codex-Antworten.
<!-- audit:codex-responses:end -->

## Validierungsattestierung

<!-- audit:validation-attestation:begin -->
### Ereignis 1: `validation-9b877e03889d`

- Diff-Fingerprint: `9b877e03889d5c72f44a2bf7a1a70e4ae823c38c09b01005a4c4e86546d0280e`
- Status: `PASS`
- Vollständig: `YES`
- Kurzresultat: 1 passed; 0 failed; 0 unavailable; 1 required
- Ausgabedigest: `90af301f35c19443a2c6c99c706394d0bb0e8fd9845d1f5ae27731af43d673e7`

| Matrixbefehl | Status | Exitcode | Kompaktausgabe |
|---|---|---:|---|
| shell: npm test | PASS | 0 | &gt; ruhestand-app-final@1.0.0 test<br>&gt; node tests/run-tests.mjs<br><br>🚀 Starting Test Runner...<br>Found 169 test files.<br><br>📂 Running 3bucket-config.test.mjs in process...<br>--- 3-Bucket Config Tests ---<br>✅ 3-Bucket config tests passed<br>✅ 3bucket-config.test.mjs completed.<br>📊 FILE RESULT: 3bucket-config.test.mjs &#124; mode=in-process &#124; assertions=17 &#124; passed=17 &#124; failedAssertions=0 &#124; failedFiles=0<br><br>📂 Running 3bucket-refill.test.mjs in process...<br>--- 3-Bucket Refill Tests ---<br>✅ 3-Bucket refill tests passed<br>✅ 3bucket-refill.test.mjs completed.<br>📊 FILE RESULT: 3bucket-refill.test.mjs &#124; mode=in-process &#124; assertions=32 &#124; passed=32 &#124; failedAssertions=0 &#124; failedFiles=0<br><br>📂 Running architecture-evidence.test.mjs in process...<br>--- Architecture Evidence Contract Tests ---<br>✅ Architecture evidence contract tests passed<br>✅ architecture-evidence.test.mjs completed.<br>📊 FILE RESULT: architecture-evidence.test.mjs &#124; mode=in-process &#124; assertions=24 &#124; passed=24 &#124; failedAssertions=0 &#124; failedFiles=0<br><br>📂 Running auto-optimize-fidelity<br>...[174072 characters omitted]...<br>ete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/app/profile/profile-storage.js:537:28)<br>    at initProfileSubpageLifecycle (file:///mnt/c/Users/Diete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/app/profile/profile-navigation.js:157:5)<br>    at initProfileBridge (file:///mnt/c/Users/Diete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/app/profile/profile-bridge.js:8:5)<br>    at async Promise.all (index 0)<br>    at async MockDocument.dispatch (file:///mnt/c/Users/Diete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/tests/profile-ui-contract.test.mjs:80:9)<br>    at async runProfileUiContractTests (file:///mnt/c/Users/Diete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/tests/profile-ui-contract.test.mjs:244:9)<br>    at async file:///mnt/c/Users/Diete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/tests/profile-ui-contract.test.mjs:257:9<br>[VALIDATION ERROR] Invalid input fields: [<br>  {<br>    fieldId: 'goGoMultiplier',<br>    message: 'goGoMultiplier muss zwischen 1.0 und 1.5 liegen.'<br>  }<br>] |
<!-- audit:validation-attestation:end -->

## Testfreigabe und Pre-Mortem

<!-- audit:test-approval-premortem:begin -->
- Teständerungsfreigabe: nicht erfasst.
- Pre-Mortems:
  - Ereignis 2: Most likely failure in three months is that a later, unrelated slice edits Handbuch.html (new section, renamed anchor, or copy-paste of a TOC entry) and silently breaks or duplicates an id/hash target, because no automated check exists to catch it — the regression would only surface via manual inspection or a user-reported dead link, not via &#96;npm test&#96;.
  - Ereignis 3: A future update renames a tab ID or a user follows a broken link, causing the page to appear completely empty because the fallback logic toggles the button class but not the section visibility.
<!-- audit:test-approval-premortem:end -->

## Findings-Lebenszyklus

<!-- audit:findings:begin -->
### `A-01` — `OPEN`

- Quelle: `antigravity`; Runde 1
- Klasse: `OBSERVATION`
- Finding: The fallback logic in switchTab activates the first tab button when no ID matches, but it fails to activate the corresponding content section, leaving all sections with aria-hidden="true" and visually inactive.
- Akzeptanztest: Fix the fallback logic in switchTab to activate the first content section in addition to the first tab button.
- Statusbegründung: –

### `C-01` — `OPEN`

- Quelle: `claude`; Runde 1
- Klasse: `OBSERVATION`
- Finding: Handbuch.html has no automated, CI-wired anchor/ID-integrity check; the only current guarantee is Codex's self-reported static pass.
- Akzeptanztest: Add a small Node script (e.g. tests/handbuch-links.test.mjs or a standalone check) that parses Handbuch.html, asserts every &#96;id&#96; attribute is unique, and that every internal &#96;href="#…"&#96; (and &#96;data-tab-target&#96; anchor jump) resolves to an existing id in the document, and register it so &#96;npm test&#96; (or an equivalent lightweight &#96;npm run test:docs&#96;) exercises it; VALIDATE: ["node", "tests/handbuch-links.test.mjs"]
- Statusbegründung: –
<!-- audit:findings:end -->

## Entscheidungstabelle

<!-- audit:decision-table:begin -->
| ID | Quelle | Finding | Klasse | Entscheidung | Umsetzung |
|---|---|---|---|---|---|
| A-01 | antigravity | The fallback logic in switchTab activates the first tab button when no ID matches, but it fails to activate the corresponding content section, leaving all sections with aria-hidden="true" and visually inactive. | OBSERVATION | offen | offen |
| C-01 | claude | Handbuch.html has no automated, CI-wired anchor/ID-integrity check; the only current guarantee is Codex's self-reported static pass. | OBSERVATION | offen | offen |
<!-- audit:decision-table:end -->

## Rückdokumentation in die Arbeitsplan-MD

Arbeitsplan: `docs/internal/handbuch.md` (schreibgeschützte fachliche Quelle). Die Umsetzung und
Validierung werden ausschließlich in dieser Slice-Datei rückdokumentiert, da der Orchestrator den
Änderungsscope auf die beiden Slice-Pfade begrenzt.

## Freigabestatus

<!-- audit:approval-status:begin -->
- Implementierung bereit: `YES`
- Validierung: `PASS`
- Claude-Freigabe: `YES`
- Antigravity-Freigabe: `YES`
- Red-State-Folgeslice: `NONE`
- Commit autorisiert: `YES`
<!-- audit:approval-status:end -->
