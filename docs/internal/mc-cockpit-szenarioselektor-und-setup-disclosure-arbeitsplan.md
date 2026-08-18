# Arbeitsplan – MC-Cockpit: Szenarioselektor und Setup-Disclosure

**Status:** Entwurf zur externen Planprüfung

**Feature-Branch:** `feature/mc-ergebnis-cockpit`

**GitHub-Status:** im Rahmen dieser Planungsstufe nicht geprüft oder verändert

**Planungsmodus:** `PLAN_ONLY`

## Ziel

Zwei rein visuelle beziehungsweise bedienlogische Verträge des Monte-Carlo-Ergebnis-Cockpits werden korrigiert, ohne Berechnung, Szenarioauswahlsemantik oder Exporte zu verändern:

1. Der einzige dynamische Szenarioselektor steht wieder zusammen mit dem von ihm gesteuerten Log im Ergebnis-Tab „Szenario-Logs“. Die erste Replay-Schrittkarte zeigt dieselbe aktuelle Auswahl nur lesend an und bietet weiterhin die Fixieraktion sowie einen Weg zurück zur Auswahl.
2. Das nach erfolgreichem Lauf weiterhin automatisch geschlossene Monte-Carlo-Setup erhält einen sichtbaren, zustandsabhängigen Aufklappindikator und die Textzustände „Setup bearbeiten“ beziehungsweise „Setup ausblenden“.

## Repository-Befund und bestehende Verträge

- `Simulator.html` enthält `#scenarioSelector` derzeit in `#mcViewPanelReplay`, während `#scenarioLogOutput` in `#mcViewPanelLogs` liegt. Da `activateMonteCarloResultView()` in `app/simulator/mc-result-cockpit.js` genau ein Panel sichtbar hält, ist die Wirkung einer Auswahl im Auswahlmoment nicht sichtbar.
- `displayMonteCarloResults()` in `app/simulator/simulator-results.js` ersetzt bei jedem Lauf ausschließlich den Inhalt des stabilen `#scenarioSelector`, erzeugt darin genau ein `#scenarioSelect`, wählt standardmäßig `char_worst`, rendert das Log und übergibt das ausgewählte Szenario an `selectStressReplayScenario()`. Der Pfad ohne Logs leert den stabilen Knoten und setzt die Replay-Auswahl zurück. Diese Ein-Knoten-, Default- und Reset-Verträge bleiben erhalten.
- Der `#mcShowReplayButton` wird in `initMonteCarloResultCockpit()` derzeit auf `#scenarioSelect` oder ersatzweise `#stressReplayStatus` fokussiert. Nach der Rückverlagerung darf dieser Pfad nicht mehr auf den im Logs-Panel liegenden Select zielen, weil die Replay-Aktivierung ihn wieder verbergen würde.
- `selectStressReplayScenario()` hält in `app/simulator/stress-replay-ui.js` bereits den fachlichen ausgewählten Lauf und den Aktivierungszustand von `#stressReplayFixButton`. Die neue Anzeige ist lediglich eine Projektion der Daten, die `simulator-results.js` beim selben Auswahlereignis bereits besitzt; es wird kein zweiter Auswahlzustand eingeführt und `stress-replay-ui.js` muss dafür nicht geändert werden.
- `completeMonteCarloCockpitRun()` schließt `#mcSetupDisclosure` absichtlich erst nach einem erfolgreichen Lauf. `simulator.css` ersetzt für dessen `summary` den nativen `list-item` durch Flex-Layout, ohne einen eigenen Disclosure-Indikator bereitzustellen. Der Sondervertrag des im geschlossenen Setup visuell versteckten, aber auf Fokus sichtbaren `#mcButton` liegt in separaten `@media screen`-Regeln und bleibt unverändert.
- Die Druckregeln machen die Inhalte eines geschlossenen Setups und alle Ergebnis-Panels sichtbar. Die Korrektur darf diese Regeln ebenso wenig schwächen wie die responsive Anordnung des Setup-Summarys bei höchstens 700 px und die Replay-Anordnung bei höchstens 899 px.

## Festgelegte Umsetzung

### Szenario-Logs und Replay

- `#scenarioSelector` wird als stabiler Einzelknoten in `#scenarioLogContainer` direkt im Bedienzusammenhang mit `#scenario-controls` und vor `#scenarioLogOutput` platziert. Das erzeugte `#scenarioSelect` bleibt dynamisch und eindeutig.
- Der Text des vorhandenen Logs-zu-Replay-Rückverweises wird an die neue Platzierung angepasst. `#mcShowReplayButton` bleibt erhalten und aktiviert das Replay-Panel.
- Replay-Schritt 1 erhält einen dauerhaft vorhandenen, lesenden Ausgabebereich für Label, Endvermögen oder `FAILED` und Pflegemarkierung des ausgewählten Szenarios. Seine Aktualisierung erfolgt im vorhandenen `renderSelectedScenario()`-Pfad aus demselben Szenarioobjekt, das unmittelbar danach an `selectStressReplayScenario()` übergeben wird. Leere, nicht auflösbare und loglose Zustände setzen die Anzeige auf einen eindeutigen „kein Lauf ausgewählt“-Zustand zurück.
- Neben der lesenden Anzeige bleiben `#stressReplayFixButton` und dessen vorhandener Controller-Vertrag unverändert. Ein neuer Replay-zu-Logs-Button aktiviert über `activateMonteCarloResultView()` das Logs-Panel und fokussiert dort den vorhandenen `#scenarioSelect`; fehlt er vor einem Lauf, wird ein sichtbares Ziel im Logs-Panel fokussiert.
- `#mcShowReplayButton` fokussiert nach Aktivierung des Replay-Panels ein dort tatsächlich enthaltenes und sichtbares Ziel: bei vorhandener Auswahl bevorzugt den Fixier-/Auswahlbereich, andernfalls den vorhandenen Status beziehungsweise den neuen Rückverweis. Ein verborgenes Element aus dem Logs-Panel ist kein Replay-Fokusziel.
- Es werden weder ein zweiter Select noch eine automatische Ansichtumschaltung im Change-Handler eingeführt.

### Setup-Disclosure

- Das native `summary` erhält im Markup zwei kurze Zustandslabels. CSS zeigt abhängig von `[open]` genau „Setup ausblenden“ oder „Setup bearbeiten“.
- Ein CSS-Pseudoelement erzeugt ein sichtbares Chevron und dreht es abhängig von `[open]`. Text und Symbol ergänzen sich; die Verständlichkeit hängt nicht allein von Farbe oder Form ab.
- Das vorhandene native `<details>/<summary>` bleibt die einzige Interaktionsmechanik. Damit bleiben Maus- und Tastaturaktivierung sowie die bestehende `:focus-visible`-Darstellung erhalten; es wird kein paralleler JavaScript-Offenzustand eingeführt.
- `completeMonteCarloCockpitRun()` und die Screen-Sonderregeln für den geschlossenen `#mcButton` werden funktional nicht geändert. Die Druckregeln zeigen das Setup weiterhin vollständig.

## Akzeptanzkriterien

1. Im sichtbaren Tab „Szenario-Logs“ kann der Nutzer das Szenario wechseln und sieht das aktualisierte Log ohne Tab-Wechsel.
2. Im Dokument existieren nach Initialisierung, erstem Lauf und erneutem Lauf jeweils genau ein `#scenarioSelector` und ein `#scenarioSelect`; ein Lauf ohne Szenario-Logs leert den Selektorknoten sowie die lesende Replay-Anzeige und lässt keine alte fixierbare Auswahl zurück.
3. Replay-Schritt 1 zeigt für den aktuell gewählten Lauf Label, formatiertes Endvermögen oder `FAILED` und die Pflegemarkierung. Der bestehende Fixierbutton ist ohne gültige Auswahl deaktiviert und mit gültiger Auswahl weiterhin ausführbar.
4. Der neue Replay-zu-Logs-Weg aktiviert Logs und fokussiert den dort sichtbaren Select. Der bestehende Logs-zu-Replay-Weg aktiviert Replay und fokussiert dort ein existierendes sichtbares Ziel – sowohl vor als auch nach einem Lauf.
5. Abschluss eines erfolgreichen Monte-Carlo-Laufs schließt das Setup weiterhin. Das geschlossene Summary zeigt Chevron und „Setup bearbeiten“; nach Aktivierung zeigt es unveränderte Eingabewerte und „Setup ausblenden“. Eine erneute Aktivierung schließt es wieder und der Indikator folgt dem Zustand.
6. Summary und Cockpit-Tabliste bleiben per Tastatur bedienbar, sichtbare Fokusziele werden nicht durch inaktive Panels verdeckt und `#stressReplayFixButton` behält seinen vorhandenen Aktivierungsvertrag.
7. Bei 700 px und 899 px entsteht durch Selektor, Replay-Auswahlprojektion oder Disclosure-Affordance kein Seitenoverflow. Die bestehenden Breakpoints und die Anordnung der übrigen Replay-Schrittkarten bleiben erhalten.
8. In der Druckdarstellung wird ein am Bildschirm geschlossenes Setup vollständig ausgegeben; reine Navigationselemente und die fünf Ergebnisansichten behalten ihren bestehenden Druckvertrag.
9. Anzahl, Reihenfolge und Beschriftung der fünf Ergebnis-Unteransichten, Engine-Semantik, Monte-Carlo-Berechnung, Exportformate und Stresspfad-Verträge bleiben unverändert.

## Nicht-Scope

- Kein zweiter oder synchronisierter Szenarioselektor und kein automatischer Tabwechsel beim Ändern des Selects.
- Keine Änderung an `selectStressReplayScenario()`, am Replay-Workspace-Datenmodell oder an den Schrittkarten 2 und 3 beziehungsweise deren Vergleichsansichten.
- Keine Änderung an Monte-Carlo-Runnern, Workern, Engine, Seed-/Samplinglogik, Persistenz oder Exportverträgen.
- Keine Änderung am automatischen Einklappen nach erfolgreichem Lauf und keine Änderung der terminalen Fokusbehandlung des kanonischen `#mcButton`.
- Keine manuelle Änderung an `engine.js`, `dist/` oder `RuheStandSuite.exe`.

## Risiken und Gegenmaßnahmen

- **Doppelzustand zwischen Logs und Replay:** Die Replay-Anzeige wird ausschließlich im bestehenden Select-Renderpfad aus dem bereits aufgelösten Szenario projiziert und bietet keine eigene Auswahlsteuerung. Eindeutigkeits- und Zwei-Läufe-Tests sichern die DOM-Kardinalität.
- **Veraltete Anzeige nach Rerender oder fehlenden Logs:** Jeder frühe Leer-/Fehlerpfad muss Select, Logprojektion, Replay-Projektion und `selectStressReplayScenario(null)` gemeinsam zurücksetzen. Der Browserlauf prüft einen zweiten Render; der statische Vertrag prüft den stabilen Einzelknoten.
- **Fokus im falschen Panel:** Beide panelübergreifenden Buttons müssen zuerst den zentralen Aktivierungsweg aufrufen und erst danach ein nachweislich enthaltenes Ziel fokussieren. Unit- und Browsertests prüfen beide Richtungen vor und nach einem Lauf.
- **Disclosure-Affordance verdeckt oder nur visuell codiert:** Das sichtbare Zustandslabel ergänzt das Chevron. Browserprüfungen kontrollieren Text, Zustand, Tastaturaktivierung und erhaltene Eingabewerte.
- **CSS-Regressionsrisiko an Breakpoints und Druck:** Die bestehenden 700-/899-px- sowie Print-Prüfungen werden um die neuen Elemente erweitert, ohne Prüfungen abzusenken oder durch rein statische Selektorchecks zu ersetzen.

## Umsetzungsslices

### Slice 1 - Szenarioauswahl, Replay-Projektion und Setup-Affordance

Dieser eine fachlich geschlossene Slice ändert die zwei zusammengehörigen Cockpit-Bedienverträge, ihre Fokuspfade, Regressionstests und Dokumentation. Vor dem ersten Produktedit wird die vorgeschriebene Slice-MD angelegt und mit Branch-/Statuscheck sowie Diff-Risiko befüllt. Der Slice darf nicht in einen bewusst roten Zwischenzustand übergeben werden.

**Exakter Änderungspfad**

- `Simulator.html`
- `simulator.css`
- `app/simulator/simulator-results.js`
- `app/simulator/mc-result-cockpit.js`
- `tests/mc-result-cockpit.test.mjs`
- `tests/browser-smoke.test.mjs`
- `tests/simulator-monte-carlo-browser.mjs`
- `docs/reference/TECHNICAL.md`
- `docs/reference/SIMULATOR_MODULES_README.md`
- `Handbuch.html`
- `docs/internal/slice-mc-cockpit-szenarioselektor-und-setup-disclosure-01-ui-vertragskorrektur.md`
- `docs/internal/mc-cockpit-szenarioselektor-und-setup-disclosure-arbeitsplan.md`

#### Arbeitsschritte

1. In der Slice-MD den aktiven Branch `feature/mc-ergebnis-cockpit`, den unveränderten Ausgangsstatus, die zwölf erlaubten Pfade, vier produktive Änderungseinheiten, betroffene Tests, Nicht-Scope und eine dateigenaue Rollback-Strategie festhalten.
2. In `Simulator.html` den stabilen Selector in den Logs-Bedienzusammenhang verschieben, Replay-Schritt 1 mit semantischer lesender Auswahlprojektion und Rückweg ergänzen sowie die zwei sichtbaren Disclosure-Zustandslabels ergänzen. Bestehende IDs werden nicht dupliziert; neue Anzeige- und Aktions-IDs sind dokumentweit eindeutig.
3. In `simulator-results.js` die lesende Replay-Projektion im selben Auswahl-/Resetpfad aktualisieren, der Log, Exportfreigabe und `selectStressReplayScenario()` steuert. Vorhandene Formatierung und die Default-Auswahl `char_worst` weiterverwenden; keine neue fachliche Auswahlquelle einführen.
4. In `mc-result-cockpit.js` die beiden panelübergreifenden Fokuspfade über `activateMonteCarloResultView()` verdrahten und ausschließlich Ziele aus dem danach sichtbaren Panel fokussieren. Initialisierung bleibt je Dokument idempotent; Listener dürfen sich bei Wiederaufruf nicht stapeln.
5. In `simulator.css` Replay-Projektion/Rückweg passend zum vorhandenen Auswahlzeilenlayout gestalten und die Setup-Zustandslabels sowie das rotierende Chevron über `[open]` steuern. Vorhandene `:focus-visible`-, `@media screen`-, 700-/899-px- und Print-Verträge nur ergänzen, nicht abschwächen.
6. Unit-/statische Verträge in `mc-result-cockpit.test.mjs` auf die neue DOM-Position, ID-Eindeutigkeit, bidirektionale Fokusziele, Listener-Kardinalität und unverändertes Erfolgseinklappen umstellen.
7. `browser-smoke.test.mjs` um native Tastaturaktivierung des Setup-Summarys, zustandsabhängige Label-/Chevron-Prüfung, Werterhalt, Fokus-Sichtbarkeit, neue Selectorposition sowie responsive und Print-Wirkung ergänzen. Bestehende Assertions werden als begründete Vertragsänderung gleichwertig oder tiefer ersetzt.
8. Im echten Erfolgsfall von `simulator-monte-carlo-browser.mjs` Szenariowechsel und sichtbare Logaktualisierung im Logs-Panel, Replay-Projektion/Fixieren, beide Rückwege, Setup schließen/öffnen mit Werterhalt sowie Selektor-Eindeutigkeit nach erneutem Lauf prüfen.
9. `TECHNICAL.md`, `SIMULATOR_MODULES_README.md` und `Handbuch.html` auf den neuen Ein-Selektor-, Projektions-, Fokus- und Disclosure-Vertrag synchronisieren. Im Handbuch den tatsächlichen Buttontext „In Replay anzeigen“ verwenden.
10. Ergebnisse, Abweichungen, Restrisiken und Rückdokumentation in Slice-MD und Arbeitsplan festhalten; Freigabe ausschließlich den externen Reviewern beziehungsweise dem Nutzer überlassen.

#### Fokussierte Validierung während der Umsetzung

- `node tests/run-single.mjs tests/mc-result-cockpit.test.mjs`
- `node --check app/simulator/simulator-results.js`
- `node --check app/simulator/mc-result-cockpit.js`
- `node --check tests/mc-result-cockpit.test.mjs`
- `node --check tests/browser-smoke.test.mjs`
- `node --check tests/simulator-monte-carlo-browser.mjs`
- `git diff --check`

Die vollständige autoritative Matrix wird anschließend vom Orchestrator ausgeführt:

- `npm test`
- `npm run test:browser`

Der Browserlauf umfasst dabei auch `tests/simulator-monte-carlo-browser.mjs`; dessen kleine reale Monte-Carlo-Läufe sind der maßgebliche Integrationsnachweis für Abschluss, Rerender, Logwechsel und Replay-Fixierung.

#### Manuelle Abnahme

- Desktop: Lauf abschließen, Szenario im Logs-Tab wechseln, sichtbare Logwirkung kontrollieren, zum Replay wechseln und fixieren, danach zurück zur Auswahl wechseln.
- Wiederholung: einen weiteren Monte-Carlo-Lauf starten und DOM-Eindeutigkeit sowie aktuelle Replay-Projektion kontrollieren.
- Tastatur: MC-Tabliste, Setup-Summary, Szenario-Select, beide panelübergreifenden Aktionen und Fixierbutton bedienen; Fokus muss sichtbar und im aktiven Panel liegen.
- Responsive: Viewports mit 700 px und 899 px prüfen, insbesondere Summary-Zustandslabel, Selektorzeile und Replay-Schritt 1.
- Druckvorschau: Setup vor dem Druck schließen und kontrollieren, dass alle Setup-Felder sowie die bestehenden Ergebnis-/Replay-Inhalte vollständig ausgegeben werden.

#### Stopbedingungen des Slice

- Stoppen, falls die eindeutige Kopplung von `#scenarioSelect` an `selectStressReplayScenario()` nur mit einem zweiten Select oder einem zweiten fachlichen Auswahlzustand möglich wäre.
- Stoppen, falls ein Reset ohne Szenario-Logs Select, lesende Projektion und Fixierzustand nicht gemeinsam leeren kann.
- Stoppen, falls eine bestehende Browserprüfung nur durch geringere Prüftiefe statt durch eine gleichwertige neue Vertragserwartung grün werden kann.
- Die allgemeinen Stopregeln aus `AGENTS.md` gelten zusätzlich, insbesondere bei unerwarteter Engine-Semantik, UI-/Engine-Parameternamenskonflikten, nicht ausführbarer Validierung oder mehr als zehn produktiven Änderungseinheiten.

## Review- und Abschlussfolge

1. Claude prüft Plan und später den Slice adversarial gegen Korrektheit, DOM-/Fokusverträge, Fehler-/Resetpfade, CSS-Zustände und Testtiefe.
2. Antigravity prüft denselben freigegebenen Fingerprint anschließend einmalig und unabhängig.
3. Codex beantwortet Findings und korrigiert innerhalb der exakten Pfade, markiert die eigene Arbeit aber niemals als freigegeben.
4. Erst nach externer Slice-Freigabe und autoritativer Validierung darf der Orchestrator den dokumentierten Git-Commit erzeugen. Push, Merge und History-Änderungen erfolgen nicht ohne ausdrückliche Nutzerfreigabe.
5. Das branchweite Abschlussreview muss alle offenen Findings schließen oder eskalieren; neue Defekte führen zu einem begrenzten Korrekturslice, nicht zu stiller Scope-Ausweitung.

## Planungsabschluss

- Der Plan umfasst genau einen 1-basierten Implementierungsslice, weil beide Befunde denselben Cockpit-DOM-, Fokus-, Browser- und Dokumentationsvertrag betreffen und eine Aufteilung dieselben Kernpfade mehrfach anfassen würde.
- Produktive Änderungseinheiten: vier (`Simulator.html`, `simulator.css`, zwei JavaScript-Module); damit greift die Dateilimit-Stopregel nicht.
- Der Plan nimmt keine externe Freigabe vor. Statuswechsel auf implementierungsreif und Git-Transaktionen liegen beim Orchestrator nach Claude-/Antigravity-Prüfung.

## Orchestrator-Prüfprotokoll

### Review-Feedback von Claude

<!-- audit:claude-review:begin -->
### Ereignis 2: Runde 1

- Reviewer: `claude`
- Freigabe: `YES`
- Validierungsbindung: `plan-validation-5ff450ae89f4`
- Testdateien: keine
- Eigene Findings: `C-01`
<!-- audit:claude-review:end -->

### Review-Feedback von Antigravity

<!-- audit:antigravity-review:begin -->
### Ereignis 3: Runde 1

- Reviewer: `antigravity`
- Freigabe: `YES`
- Validierungsbindung: `plan-validation-5ff450ae89f4`
- Testdateien: keine
- Prüfdimensionen: scope discipline (4 productive change units, 1 implementation slice), DOM cardinality and single-selector integrity (#scenarioSelector, #scenarioSelect), cross-panel bidirectional focus routing (Logs &lt;-&gt; Replay), native &lt;details&gt;/&lt;summary&gt; CSS disclosure affordance ([open] selector, chevron pseudo-element, state text), responsive layout preservation (700px, 899px), print media contracts, test matrix coverage (unit, smoke, real MC browser runner), documentation sync
- Größtes Restrisiko: CSS flex layout on &lt;summary&gt; at &lt;= 700px viewports causing label wrapping or overflow when combined with long parameter summaries and state text
- Realistische Bruchbedingung: Narrow mobile viewport (&lt;= 700px) combined with verbose parameter summaries and state text causing line wrapping or flex overflow if gap and flex-shrink are not cleanly constrained in simulator.css
- Eigene Findings: keine
<!-- audit:antigravity-review:end -->

### Review-Antworten von Codex

<!-- audit:codex-responses:begin -->
Noch keine strukturierten Codex-Antworten.
<!-- audit:codex-responses:end -->

### Validierungsattestierung

<!-- audit:validation-attestation:begin -->
### Ereignis 1: `plan-validation-5ff450ae89f4`

- Diff-Fingerprint: `5ff450ae89f4f2e7f17b1fe6d37b84b7fda7891fe76a9b62ed97a2b41debec4c`
- Status: `PASS`
- Vollständig: `YES`
- Kurzresultat: internal plan contract passed
- Ausgabedigest: `af5b917786495da380b26c692ce3de03dcac81c1282d6eb6fbe59e33a9854a53`

| Matrixbefehl | Status | Exitcode | Kompaktausgabe |
|---|---|---:|---|
| internal:work-plan-contract | PASS | 0 | slices=1; planned_paths=1; changed_paths=1; future_slices=1; work_plan=docs/internal/mc-cockpit-szenarioselektor-und-setup-disclosure-arbeitsplan.md |
<!-- audit:validation-attestation:end -->

### Testfreigabe und Pre-Mortem

<!-- audit:test-approval-premortem:begin -->
- Teständerungsfreigabe: nicht erfasst.
- Pre-Mortems:
  - Ereignis 2: Most likely failure in three months: the two new cross-panel focus paths (Logs→Replay via #mcShowReplayButton, and the new Replay→Logs button) are specified only in prose ("bevorzugt den Fixier-/Auswahlbereich, andernfalls den vorhandenen Status beziehungsweise den neuen Rückverweis") rather than as a single shared target-resolution helper; a later unrelated cockpit change moves or renames one of the fallback targets, activateMonteCarloResultView() still flips panel visibility correctly, but focus lands on a now-hidden element in the previously active panel, reintroducing the exact "focus in wrong/inactive panel" defect class this plan set out to fix — and it would only be caught if the browser-smoke keyboard/focus assertions from arbeitsschritt 7 are kept as strict, non-downgraded checks rather than loosened to satisfy existing selector-position assertions.
  - Ereignis 3: In three months, future modifications to Replay Step 1 or simulator results rendering could accidentally bypass the read-only projection update in simulator-results.js or introduce a duplicate local state, causing the Replay Step 1 display to desynchronize from the selected log in the Logs tab if the single-projection contract tests in mc-result-cockpit.test.mjs are ever loosened.
<!-- audit:test-approval-premortem:end -->

### Findings-Lebenszyklus

<!-- audit:findings:begin -->
### `C-01` — `OPEN`

- Quelle: `claude`; Runde 1
- Klasse: `OBSERVATION`
- Finding: Plan's Nicht-Scope section (and by extension the future slice's Nicht-Scope, which is expected to mirror it) restates the assignment's exclusion of Replay-Schrittkarten 2 bis 4 as only "Schrittkarten 2 und 3," silently dropping Schrittkarte 4 from the stated boundary even though no planned path or acceptance criterion targets it.
- Akzeptanztest: During Slice 1 review, confirm the slice document's Nicht-Scope/risk section explicitly excludes Replay-Schrittkarte 4 (not only 2 and 3), matching the assignment's full "2 bis 4" exclusion, and that no diff path touches it.
- Statusbegründung: –
<!-- audit:findings:end -->

### Entscheidungstabelle

<!-- audit:decision-table:begin -->
| ID | Quelle | Finding | Klasse | Entscheidung | Umsetzung |
|---|---|---|---|---|---|
| C-01 | claude | Plan's Nicht-Scope section (and by extension the future slice's Nicht-Scope, which is expected to mirror it) restates the assignment's exclusion of Replay-Schrittkarten 2 bis 4 as only "Schrittkarten 2 und 3," silently dropping Schrittkarte 4 from the stated boundary even though no planned path or acceptance criterion targets it. | OBSERVATION | offen | offen |
<!-- audit:decision-table:end -->

### Freigabestatus

<!-- audit:approval-status:begin -->
- Implementierung bereit: `NOT_RECORDED`
- Validierung: `PASS`
- Claude-Freigabe: `YES`
- Antigravity-Freigabe: `YES`
- Red-State-Folgeslice: `NONE`
- Commit autorisiert: `NO`
<!-- audit:approval-status:end -->
